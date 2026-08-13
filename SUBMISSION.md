# Terminal3 ADK Testnet Submission

## Public Repository

Repository: https://github.com/MRSKYWAY/Tenant
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
9. Added the profile fields required by `http-with-placeholders`.
10. Authorized the agent/user self-call for `api.duffel.com` egress.
11. Invoked `search-offers` successfully and received five Duffel sandbox offers.
12. Invoked `book-offer` successfully and received a confirmed booking.

Final successful booking output:

```json
Booking result: {
  "id": "ord_0000B9KxYx66kw2Zqc7W4W",
  "pnr": "GJYKPM",
  "status": "confirmed"
}
```

## Screenshots

Add screenshots below in the public Google Doc:

- SSO claim page showing created ID / credits, with secrets redacted.
- `npm run quickstart` output showing `Connected as: did:t3n:...`.
- `TenantClient ready.` output.
- Rust WASM build output showing `z_tenant_flight.wasm`.
- `cargo build --target wasm32-wasip2 --release` output.
- Native test output: `cargo test --target x86_64-unknown-linux-gnu`.
- `npm run register` output showing contract registration and `contract_id`.
- Secret map creation / seeding output.
- `npm run upsert-user-profile` output showing `txHash`.
- Final `npm run invoke` output showing offers and confirmed booking.
- Bug screenshots with request IDs for each failure below.

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

### 5. Walkthrough-generated agent keys have zero testnet credits

The invocation flow failed at `action.execute` with `InsufficientCredit (required=10000000000, available=0)` for account `b6782e89acc1f3f86d1083c7a7859c71b2e908b6`. This happened after the tenant quickstart and contract setup, when the generated agent account attempted to run `search-offers`.

Suggested fix: make the docs explicit that the agent caller account also needs testnet credits, not only the tenant account. The error included request ID `d0bac4f5-f935-49ee-b9c8-0053b4ca1afc`.

### 6. Re-registration can leave the `secrets` map ACL pointing at an old contract ID

After re-registering the same contract tail with a new version, invocation failed with a KV ACL error:

```text
TenantContract(did:t3n:df9717fb65306d801326a6fc265257a1957a52d7/662) cannot read map "z:df9717fb65306d801326a6fc265257a1957a52d7:secrets"
```

Request ID: `b290a932-4f85-4a8a-9281-90b574223282`.

Suggested fix: after registration, if the `secrets` map already exists, update its readers/writers ACL with the latest returned `contract_id`. A docs note would help because contract IDs change across registrations.

### 7. Delegated execute needs explicit `pii_did` for egress grant resolution

Invocation initially failed with:

```text
host/http.egress_denied: no egress allowlist resolved for this call — no matching agent_auth grant for pii_did='did:t3n:df9717fb65306d801326a6fc265257a1957a52d7'
```

Request ID: `8136f7e7-0d0d-4caf-aba3-2e6dc17ab02a`.

Fix used: pass the authenticated user DID as `pii_did` on `executeAndDecode()` for both `search-offers` and `book-offer`.

Suggested docs fix: show `pii_did` in the walkthrough invocation snippet anywhere a contract depends on a user grant or profile placeholders.

### 8. `book-offer` fails until required profile fields exist

After egress was fixed, placeholder resolution reached the profile but failed because a required field was absent:

```text
contract error: duffel create-order: user profile missing field: date_of_birth
```

Request ID: `b6e07d9e-3ac2-4f6b-9d78-766acfd79c6a`.

Fix used: submit user profile fields before booking, including `first_name`, `last_name`, `date_of_birth`, and `gender`.

Suggested docs fix: list the profile fields required by the reference `book-offer` contract before the invocation step.

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
npm run repair-secret-acl
npm run seed-secret
npm run upsert-user-profile
npm run invoke

cd /home/skye/Tenant/z-tenant-flight
rustup target add wasm32-wasip2
cargo build --target wasm32-wasip2 --release
cargo test --target x86_64-unknown-linux-gnu
```

## Notes

No private API keys are committed. Runtime keys are loaded from environment variables or `.env`, which is gitignored.
