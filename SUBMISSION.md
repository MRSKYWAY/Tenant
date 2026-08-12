# Terminal3 ADK Testnet Submission

## Public Repository

Repository: TODO: add public GitHub URL after push.

## Completion Summary

I completed the Terminal3 ADK onboarding flow against testnet:

1. Claimed Terminal3 ADK credentials and test credits via SSO.
2. Authenticated with `T3nClient` on the `testnet` environment.
3. Confirmed the automatically assigned tenant DID from `authenticate()`.
4. Built a `TenantClient` using the authenticated `tenantDid` and `getNodeUrl()`.
5. Cloned and built the `Terminal-3/z-tenant-flight` reference TEE contract as a WASM component.
6. Registered the WASM component under the tenant `z:<tid>:travel-contracts` namespace.
7. Created the private `secrets` KV map with explicit contract reader/writer ACLs.
8. Seeded the Duffel test API key into `z:<tid>:secrets` through `map-entry-set`.
9. Prepared invocation flow for agent authorization and `search-offers` / `book-offer`.

## Screenshots

Add screenshots below after running the commands:

- SSO claim page showing created ID / credits, with secrets redacted.
- `npm run quickstart` output showing `Connected as: did:t3n:...`.
- `TenantClient ready.` output.
- Rust WASM build output showing `z_tenant_flight.wasm`.
- `cargo test` output if used, including the WASM execution caveat below.
- `npm run register` output showing contract registration and `contract_id`.
- Secret map creation / seeding output.
- Invocation output or error output with request ID if the testnet returns one.

## Bugs / Friction Found

### 1. WSL environment can expose Windows npm without Linux node

Observed locally: `npm --version` worked from WSL, but `node --version` failed because PATH exposed `/mnt/c/Program Files/nodejs/npm` without a matching Linux `node` binary. This is a setup trap for the Quickstart because the docs ask users to run `npm` / `npx tsx`, but the actual Node runtime may be absent in WSL.

Suggested fix: add an explicit `node --version` check to the dev-environment prerequisites and recommend installing Node inside WSL with `nvm` or the distro package manager.

### 2. Quickstart depends on later context for `baseUrl`

The `TenantClient` setup requires `baseUrl: getNodeUrl()` even though `setEnvironment("testnet")` is already called. The common-errors page mentions this, but developers can miss it when following the pages sequentially.

Suggested fix: keep the `baseUrl` warning directly beside the `TenantClient` snippet in the setup page.

### 3. Contract registration is not enough for runtime success

The walkthrough registration step succeeds before `secrets` map creation and secret seeding. A developer can register successfully and still fail at invocation with `duffel_api_key not found` or an ACL error.

Suggested fix: add a small "post-register checklist" after the registration snippet: create `secrets`, set `readers` and `writers`, seed `duffel_api_key`, authorize egress.

### 4. Default `cargo test` after targeting WASI can try to execute a `.wasm` test artifact locally

After building the reference contract, `cargo test` attempted to execute `target/wasm32-wasip2/debug/deps/z_tenant_flight-*.wasm` directly and failed with `Permission denied (os error 13)`.

Suggested fix: document the intended test command or runner for WASI component tests, or explicitly say that the walkthrough validation point is the successful release WASM build.

## Initial Use Case: Private RWA Agent Onboarding

A high-value first use case is a confidential real-world asset onboarding agent. A user delegates an AI agent to collect and validate identity, accreditation, source-of-funds, sanctions screening, and jurisdiction eligibility data without exposing raw PII to the asset issuer.

The TEE contract would:

- Read reusable verified user data through Terminal3 profile placeholders.
- Call approved KYC / sanctions / accreditation providers through user-authorized outbound hosts.
- Return only a compact eligibility decision and audit reference, not raw identity data.
- Store issuer-specific API keys in `z:<tid>:secrets`.
- Emit an auditable record that the issuer can rely on for compliance review.

Why Terminal3 fits: the agent can complete the last-mile onboarding task while the user keeps custody over sensitive personal data, and the issuer gets a verifiable decision trail without becoming the direct processor of every raw field.

## Commands Used

```bash
cd /home/skye/Tenant/my-t3n-app
npm install
npm run quickstart
npm run register
npm run invoke

cd /home/skye/Tenant/z-tenant-flight
rustup target add wasm32-wasip2
cargo build --target wasm32-wasip2 --release
cargo test
```

## Notes

No private API keys are committed. Runtime keys are loaded from environment variables or `.env`, which is gitignored.
