use alloc::{format, string::String, vec::Vec};

#[derive(serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct EligibilityReq {
    pub asset_id: String,
    pub jurisdiction: String,
    pub investor_type: InvestorType,
    pub subscription_amount_usd: u64,
    #[serde(default)]
    pub attestations: Attestations,
}

#[derive(Clone, Copy, Debug, serde::Deserialize, serde::Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum InvestorType {
    Retail,
    Accredited,
    Professional,
}

#[derive(Default, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Attestations {
    #[serde(default)]
    pub kyc_level_1: bool,
    #[serde(default)]
    pub sanctions_clear: bool,
    #[serde(default)]
    pub accredited: bool,
}

#[derive(serde::Serialize)]
pub struct EligibilityResp {
    pub decision: Decision,
    pub reasons: Vec<String>,
    pub required_next_actions: Vec<String>,
    pub audit_ref: String,
}

#[derive(Clone, Copy, Debug, serde::Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum Decision {
    Eligible,
    Review,
    Reject,
}

#[derive(serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ScreeningReq {
    pub provider_url: String,
    pub asset_id: String,
    pub jurisdiction: String,
    pub investor_type: InvestorType,
    pub subscription_amount_usd: u64,
}

#[derive(serde::Serialize)]
pub struct ScreeningResp {
    pub decision: Decision,
    pub provider_ref: String,
    pub audit_ref: String,
}

pub fn check_eligibility(input: &[u8]) -> Result<Vec<u8>, String> {
    let req: EligibilityReq =
        serde_json::from_slice(input).map_err(|e| format!("check-eligibility: bad input: {e}"))?;
    validate_common(
        &req.asset_id,
        &req.jurisdiction,
        req.subscription_amount_usd,
    )?;

    let mut reasons = Vec::new();
    let mut next = Vec::new();

    if !is_supported_jurisdiction(&req.jurisdiction) {
        reasons.push("unsupported_jurisdiction".to_string());
    }
    if req.subscription_amount_usd > 100_000 && req.investor_type == InvestorType::Retail {
        reasons.push("retail_limit_exceeded".to_string());
        next.push("provide_accreditation_or_lower_amount".to_string());
    }
    if !req.attestations.kyc_level_1 {
        next.push("complete_kyc_level_1".to_string());
    }
    if !req.attestations.sanctions_clear {
        next.push("complete_sanctions_screening".to_string());
    }
    if req.investor_type == InvestorType::Accredited && !req.attestations.accredited {
        next.push("verify_accreditation".to_string());
    }

    let decision = if reasons.iter().any(|r| r == "unsupported_jurisdiction") {
        Decision::Reject
    } else if next.is_empty() {
        Decision::Eligible
    } else {
        Decision::Review
    };

    let resp = EligibilityResp {
        decision,
        reasons,
        required_next_actions: next,
        audit_ref: audit_ref(&req.asset_id, &req.jurisdiction),
    };
    serde_json::to_vec(&resp).map_err(|e| e.to_string())
}

pub fn run_screening(input: &[u8]) -> Result<Vec<u8>, String> {
    let req: ScreeningReq =
        serde_json::from_slice(input).map_err(|e| format!("run-screening: bad input: {e}"))?;
    validate_common(
        &req.asset_id,
        &req.jurisdiction,
        req.subscription_amount_usd,
    )?;
    validate_provider_url(&req.provider_url)?;

    #[cfg(target_arch = "wasm32")]
    {
        let resp = run_screening_wasm(req)?;
        serde_json::to_vec(&resp).map_err(|e| e.to_string())
    }

    #[cfg(not(target_arch = "wasm32"))]
    {
        let _ = req;
        Err("run_screening is only implemented on the wasm32 target".to_string())
    }
}

fn validate_common(asset_id: &str, jurisdiction: &str, amount: u64) -> Result<(), String> {
    if asset_id.trim().is_empty() || asset_id.len() > 64 {
        return Err("asset_id must be 1..64 characters".to_string());
    }
    if !asset_id
        .bytes()
        .all(|b| b.is_ascii_alphanumeric() || b == b'-' || b == b'_')
    {
        return Err("asset_id may contain only ASCII letters, numbers, '-' and '_'".to_string());
    }
    if !is_iso2(jurisdiction) {
        return Err("jurisdiction must be an ISO-3166 alpha-2 code".to_string());
    }
    if amount == 0 || amount > 10_000_000 {
        return Err("subscription_amount_usd must be between 1 and 10000000".to_string());
    }
    Ok(())
}

fn validate_provider_url(url: &str) -> Result<(), String> {
    if !url.starts_with("https://") {
        return Err("provider_url must use https".to_string());
    }
    if url.len() > 256 || url.contains('@') || url.contains("..") {
        return Err("provider_url failed safety validation".to_string());
    }
    Ok(())
}

fn is_iso2(value: &str) -> bool {
    value.len() == 2 && value.bytes().all(|b| b.is_ascii_uppercase())
}

fn is_supported_jurisdiction(value: &str) -> bool {
    matches!(value, "GB" | "US" | "SG" | "AE" | "HK")
}

fn audit_ref(asset_id: &str, jurisdiction: &str) -> String {
    format!("rwa:{asset_id}:{jurisdiction}:v1")
}

#[cfg(target_arch = "wasm32")]
use crate::host::{
    interfaces::{http_with_placeholders as hwp, kv_store, logging},
    tenant::tenant_context,
};

#[cfg(target_arch = "wasm32")]
fn run_screening_wasm(req: ScreeningReq) -> Result<ScreeningResp, String> {
    use serde_json::json;

    let api_key = provider_api_key()?;
    let body = json!({
        "asset_id": req.asset_id,
        "jurisdiction": req.jurisdiction,
        "investor_type": req.investor_type,
        "subscription_amount_usd": req.subscription_amount_usd,
        "subject": {
            "first_name": "{{profile.first_name}}",
            "last_name": "{{profile.last_name}}",
            "date_of_birth": "{{profile.date_of_birth}}",
            "email": "{{profile.verified_contacts.email.value}}",
            "country_of_residence": "{{profile.country_of_residence}}"
        }
    });

    let _ = logging::info(&format!(
        "Calling RWA screening provider for {}",
        req.asset_id
    ));

    let resp = hwp::call(&hwp::Request {
        method: hwp::Verb::Post,
        url: req.provider_url.clone(),
        headers: Some(alloc::vec![
            ("Authorization".to_string(), format!("Bearer {api_key}")),
            ("Accept".to_string(), "application/json".to_string()),
        ]),
        payload: Some(serde_json::to_vec(&body).map_err(|e| e.to_string())?),
    })
    .map_err(|e| format!("provider screening: {}", format_http_error(e)))?;

    if resp.code != 200 && resp.code != 201 {
        let _ = logging::error(&format!("RWA screening provider HTTP {}", resp.code));
        return Err(format!("provider screening failed: HTTP {}", resp.code));
    }

    let value: serde_json::Value = serde_json::from_slice(&resp.payload)
        .map_err(|e| format!("provider response was not JSON: {e}"))?;
    let status = value["decision"]
        .as_str()
        .or_else(|| value["status"].as_str())
        .unwrap_or("review");
    let provider_ref = value["reference"]
        .as_str()
        .or_else(|| value["id"].as_str())
        .unwrap_or("provider-ref-unavailable")
        .to_string();

    Ok(ScreeningResp {
        decision: normalize_decision(status),
        provider_ref,
        audit_ref: audit_ref(&req.asset_id, &req.jurisdiction),
    })
}

#[cfg(target_arch = "wasm32")]
fn provider_api_key() -> Result<String, String> {
    let tid = tenant_context::tenant_did();
    let map_name = format!("z:{}:secrets", hex::encode(&tid));
    let bytes = kv_store::get(&map_name, b"rwa_provider_api_key")
        .map_err(|e| format!("kv read: {e}"))?
        .ok_or("rwa_provider_api_key not found in z:<tid>:secrets")?;
    String::from_utf8(bytes).map_err(|e| e.to_string())
}

#[cfg(target_arch = "wasm32")]
fn format_http_error(e: hwp::HttpError) -> String {
    match e {
        hwp::HttpError::EgressDenied(host) => format!("egress denied for host {host}"),
        hwp::HttpError::PlaceholderDenied(marker) => {
            format!("placeholder not permitted: {marker}")
        }
        hwp::HttpError::PlaceholderUnknown(field) => {
            format!("user profile missing field: {field}")
        }
        hwp::HttpError::PlaceholderNoUserContext => {
            "no user context bound for placeholder resolution".to_string()
        }
        hwp::HttpError::UpstreamError(reason) => format!("upstream: {reason}"),
    }
}

fn normalize_decision(status: &str) -> Decision {
    match status {
        "eligible" | "approved" | "pass" | "clear" => Decision::Eligible,
        "reject" | "rejected" | "deny" | "blocked" => Decision::Reject,
        _ => Decision::Review,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn eligible_when_all_attestations_present() {
        let input = serde_json::to_vec(&serde_json::json!({
            "asset_id": "fund_alpha",
            "jurisdiction": "SG",
            "investor_type": "accredited",
            "subscription_amount_usd": 250000,
            "attestations": {
                "kyc_level_1": true,
                "sanctions_clear": true,
                "accredited": true
            }
        }))
        .unwrap();

        let bytes = check_eligibility(&input).unwrap();
        let resp: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
        assert_eq!(resp["decision"], "eligible");
        assert_eq!(resp["required_next_actions"].as_array().unwrap().len(), 0);
    }

    #[test]
    fn retail_large_subscription_goes_to_review() {
        let input = serde_json::to_vec(&serde_json::json!({
            "asset_id": "fund_alpha",
            "jurisdiction": "GB",
            "investor_type": "retail",
            "subscription_amount_usd": 150000,
            "attestations": {
                "kyc_level_1": true,
                "sanctions_clear": true
            }
        }))
        .unwrap();

        let bytes = check_eligibility(&input).unwrap();
        let resp: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
        assert_eq!(resp["decision"], "review");
        assert!(resp["reasons"]
            .as_array()
            .unwrap()
            .iter()
            .any(|v| v == "retail_limit_exceeded"));
    }

    #[test]
    fn unsupported_jurisdiction_rejects() {
        let input = serde_json::to_vec(&serde_json::json!({
            "asset_id": "fund_alpha",
            "jurisdiction": "KP",
            "investor_type": "professional",
            "subscription_amount_usd": 50000,
            "attestations": {
                "kyc_level_1": true,
                "sanctions_clear": true
            }
        }))
        .unwrap();

        let bytes = check_eligibility(&input).unwrap();
        let resp: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
        assert_eq!(resp["decision"], "reject");
    }

    #[test]
    fn rejects_raw_pii_or_unknown_fields() {
        let input = serde_json::to_vec(&serde_json::json!({
            "asset_id": "fund_alpha",
            "jurisdiction": "SG",
            "investor_type": "accredited",
            "subscription_amount_usd": 250000,
            "date_of_birth": "1990-01-01"
        }))
        .unwrap();

        let result = check_eligibility(&input);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("bad input"));
    }

    #[test]
    fn run_screening_requires_wasm_runtime() {
        let input = serde_json::to_vec(&serde_json::json!({
            "provider_url": "https://compliance.example.test/screen",
            "asset_id": "fund_alpha",
            "jurisdiction": "SG",
            "investor_type": "accredited",
            "subscription_amount_usd": 250000
        }))
        .unwrap();

        let result = run_screening(&input);
        assert!(result.is_err());
        assert!(result
            .unwrap_err()
            .contains("only implemented on the wasm32 target"));
    }
}
