# z-rwa-onboarding

Confidential RWA onboarding proof of concept for the Terminal3 ADK bonus use case.

This companion contract shows how a tenant can let a delegated agent perform investor onboarding without collecting raw PII in the agent prompt, public inputs, or issuer-facing response. The contract accepts only transaction context, uses Terminal3 profile placeholders for identity fields, and returns compact eligibility and audit outputs.

## Contract Functions

| Function | Purpose |
| --- | --- |
| `check-eligibility` | Deterministic precheck for jurisdiction, investor type, subscription size, and completed attestations. |
| `run-screening` | Optional provider call using `http-with-placeholders`, where raw profile values are resolved host-side inside the delegated user context. |

## Privacy Boundary

Raw PII is not accepted as contract input. Provider payloads contain placeholder markers such as:

```json
{
  "first_name": "{{profile.first_name}}",
  "last_name": "{{profile.last_name}}",
  "date_of_birth": "{{profile.date_of_birth}}",
  "email": "{{profile.verified_contacts.email.value}}",
  "country_of_residence": "{{profile.country_of_residence}}"
}
```

Terminal3 resolves those markers from the user's profile during the outbound provider request. The caller receives only:

```json
{
  "decision": "eligible",
  "provider_ref": "provider-ref-123",
  "audit_ref": "rwa:fund_alpha:SG:v1"
}
```

## Build And Test

```bash
cd /home/skye/Tenant/z-rwa-onboarding
cargo test
cargo build --target wasm32-wasip2 --release
```

The WASM artifact is:

```text
/home/skye/Tenant/z-rwa-onboarding/target/wasm32-wasip2/release/z_rwa_onboarding.wasm
```

## Register On Testnet

The TypeScript helper in `my-t3n-app` registers this bonus contract under `z:<tid>:rwa-onboarding`.

```bash
cd /home/skye/Tenant/my-t3n-app
npm run register-rwa
```

If `RWA_PROVIDER_API_KEY` is set, the script also stores it as `rwa_provider_api_key` in `z:<tid>:secrets` and updates the map ACL to the latest RWA contract ID.

## Invoke

```bash
cd /home/skye/Tenant/my-t3n-app
npm run invoke-rwa
```

By default this invokes `check-eligibility` with a demo accredited-investor subscription and skips the external provider call. To exercise `run-screening`, set:

```bash
RWA_PROVIDER_URL=https://your-approved-provider.example/screen
RWA_PROVIDER_API_KEY=...
```

The agent authorization step automatically includes the provider host from `RWA_PROVIDER_URL`.

## Example Input

```json
{
  "asset_id": "fund_alpha",
  "jurisdiction": "SG",
  "investor_type": "accredited",
  "subscription_amount_usd": 250000,
  "attestations": {
    "kyc_level_1": true,
    "sanctions_clear": true,
    "accredited": true
  }
}
```

## Example Output

```json
{
  "decision": "eligible",
  "reasons": [],
  "required_next_actions": [],
  "audit_ref": "rwa:fund_alpha:SG:v1"
}
```
