//! Confidential RWA onboarding demo for Terminal3 ADK.
//!
//! This component is intentionally small but follows the production pattern:
//! tenant-owned secrets live in `z:<tid>:secrets`, user PII enters outbound
//! provider requests only through Terminal3 profile placeholders, and callers
//! receive only compact eligibility decisions and audit references.

#![warn(clippy::style, missing_debug_implementations)]
#![cfg_attr(not(target_arch = "wasm32"), allow(dead_code))]

extern crate alloc;

pub const CONTRACT_VERSION: &str = "0.1.0";

wit_bindgen::generate!({
    world: "rwa-onboarding",
    path: "wit",
    additional_derives: [
        serde::Deserialize,
        serde::Serialize,
    ],
    generate_all,
});

mod screening;

struct Component;

#[cfg(target_arch = "wasm32")]
impl exports::z::rwa_onboarding::contracts::Guest for Component {
    fn check_eligibility(
        req: exports::z::rwa_onboarding::contracts::GenericInput,
    ) -> Result<alloc::vec::Vec<u8>, alloc::string::String> {
        let input = req.input.ok_or("check-eligibility: missing input")?;
        screening::check_eligibility(&input)
    }

    fn run_screening(
        req: exports::z::rwa_onboarding::contracts::GenericInput,
    ) -> Result<alloc::vec::Vec<u8>, alloc::string::String> {
        let input = req.input.ok_or("run-screening: missing input")?;
        screening::run_screening(&input)
    }
}

#[cfg(target_arch = "wasm32")]
export!(Component);

#[cfg(test)]
mod tests {
    use super::CONTRACT_VERSION;

    #[test]
    fn contract_version_is_semver() {
        let parts: Vec<&str> = CONTRACT_VERSION.split('.').collect();
        assert_eq!(parts.len(), 3);
        for part in parts {
            assert!(part.parse::<u32>().is_ok());
        }
    }
}
