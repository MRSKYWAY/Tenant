# Bug Log

## Environment

- Date: 2026-08-13
- OS: WSL Ubuntu
- Working directory: `/home/skye/Tenant`
- Runtime notes: `npm` was visible via Windows PATH, but `node` was not visible as a WSL binary.

## Bugs / Friction

1. `node` missing while `npm` exists in WSL PATH.
   - Impact: Quickstart cannot run even though `npm --version` succeeds.
   - Evidence command: `node --version`
   - Expected: docs prerequisite catches this before `npm install`.

2. `TenantClient` requires explicit `baseUrl`.
   - Impact: users may assume `setEnvironment("testnet")` is enough.
   - Fix used: `baseUrl: getNodeUrl()`.

3. Runtime requires separate post-registration setup.
   - Impact: successful registration does not mean invocation can access `duffel_api_key`.
   - Fix used: create `secrets` map with explicit `readers` and `writers`, then seed via `map-entry-set`.

4. `cargo test` attempts to execute a WASM test artifact directly.
   - Command: `cargo test`
   - Observed: `could not execute process ... .wasm` followed by `Permission denied (os error 13)`.
   - Impact: developers may interpret this as a contract failure after a successful release build.
   - Suggested docs fix: specify a WASI-compatible test runner or clarify that the walkthrough completion check is `cargo build --target wasm32-wasip2 --release`.

5. Generated agent account has no testnet credits.
   - Command: `npm run invoke`
   - Observed: `InsufficientCredit (account=b6782e89acc1f3f86d1083c7a7859c71b2e908b6, required=10000000000, available=0)`.
   - Request ID: `d0bac4f5-f935-49ee-b9c8-0053b4ca1afc`
   - Impact: the walkthrough can fail even after tenant setup because the executing agent, not just the tenant, needs credits.
   - Suggested docs fix: tell developers to fund/claim credits for the agent DID or use a funded key for invocation testing.

6. Missing `duffel_api_key` blocks the reference contract at runtime.
   - Command: `npm run invoke`
   - Observed: `contract error: duffel_api_key not found in z:<tid>:secrets`.
   - Request ID: `cd0680de-8a3a-49b1-990a-8b0d453140f4`
   - Impact: registration and authorization can succeed, but the walkthrough still fails if the Duffel secret was not seeded before invocation.
   - Fix used: added `npm run seed-secret` to populate `z:<tid>:secrets` via `tenant.maps.entrySet` after registration.

7. Re-registering created a new contract ID without updating the existing `secrets` ACL.
   - Command: `npm run invoke`
   - Observed: `TenantContract(.../662) cannot read map "z:<tid>:secrets"`.
   - Request ID: `b290a932-4f85-4a8a-9281-90b574223282`
   - Impact: successful registration can still fail if the map ACL references an older contract ID.
   - Fix used: added `npm run repair-secret-acl` and updated `npm run register` to call `tenant.maps.update` when `secrets` already exists.

8. Delegated invocation needs `pii_did` in the execute payload.
   - Command: `npm run invoke`
   - Observed: `host/http.egress_denied: no egress allowlist resolved for this call`.
   - Request ID: `8136f7e7-0d0d-4caf-aba3-2e6dc17ab02a`
   - Impact: the user can sign `agent-auth-update`, but the contract call can still resolve as a self-call or wrong user context unless `pii_did` is passed.
   - Fix used: pass the authenticated user DID as `pii_did` in both `executeAndDecode` calls.

9. Reference `book-offer` requires profile fields not prepared earlier in the walkthrough.
   - Command: `npm run invoke`
   - Observed: `contract error: duffel create-order: user profile missing field: date_of_birth`.
   - Request ID: `b6e07d9e-3ac2-4f6b-9d78-766acfd79c6a`
   - Impact: placeholder resolution works only after the user profile has the fields consumed by the contract.
   - Fix used: added `npm run upsert-user-profile` to submit demo profile fields before booking.
