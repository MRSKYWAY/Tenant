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
