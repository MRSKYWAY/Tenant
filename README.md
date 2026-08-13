# Terminal3 ADK Testnet Submission

This repo contains a fast, reproducible Terminal3 ADK onboarding run:

- TypeScript quickstart/authentication script
- Tenant client readiness check
- Reference TEE contract checkout/build instructions
- Registration and invocation scripts
- Screenshot and bug-report checklist
- Bonus RWA onboarding use-case contract and invocation scripts

## Status

The Terminal3 ADK testnet flow has been completed end to end:

- Quickstart authenticated on `testnet`
- Tenant client initialized
- `z-tenant-flight` WASM component built
- Contract registered as `z:<tid>:travel-contracts`
- `secrets` map created and seeded with the Duffel sandbox API key
- User profile fields added for placeholder resolution
- `search-offers` returned live Duffel sandbox offers
- `book-offer` returned a confirmed booking result
- Bonus `z-rwa-onboarding` contract added, tested, registered, and invoked as a second Terminal3 ADK use case

Runtime requires credentials from the claim page and sandbox provider keys:

- `T3N_API_KEY`: tenant private API key
- `AGENT_KEY`: agent key for walkthrough invocation; for the self-call demo this can match `T3N_API_KEY`
- `USER_KEY`: user/data-owner key for walkthrough authorization; for the self-call demo this can match `T3N_API_KEY`
- `DUFFEL_API_KEY`: Duffel test API key for the reference flight contract secret

## Quick Run

```bash
cd my-t3n-app
cp .env.example .env
# Fill .env locally. Do not commit it.
npm install
npm run quickstart
```

## Contract Build

```bash
git clone https://github.com/Terminal-3/z-tenant-flight.git
cd z-tenant-flight
rustup target add wasm32-wasip2
cargo build --target wasm32-wasip2 --release
ls -lh target/wasm32-wasip2/release/*.wasm
```

## Registration

```bash
cd my-t3n-app
npm run register
npm run repair-secret-acl
npm run seed-secret
npm run upsert-user-profile
```

## Invoke Walkthrough

```bash
cd my-t3n-app
npm run invoke
```

Expected final output includes a `Search result` with Duffel offers and a `Booking result` with `{ id, pnr, status: "confirmed" }`.

## Bonus Use Case Contract

The bonus implementation lives in `z-rwa-onboarding/`. It demonstrates a confidential real-world asset onboarding agent that returns eligibility decisions without exposing raw user PII to the agent or issuer.

```bash
cd z-rwa-onboarding
cargo test
cargo build --target wasm32-wasip2 --release

cd ../my-t3n-app
npm run register-rwa
npm run invoke-rwa
```

The default `invoke-rwa` path runs a deterministic `check-eligibility` call. If `RWA_PROVIDER_URL` and `RWA_PROVIDER_API_KEY` are set, it also runs `run-screening` with profile placeholders resolved inside Terminal3.

Latest successful bonus run registered `z:<tid>:rwa-onboarding` as contract id `670` and returned:

```json
{
  "decision": "eligible",
  "reasons": [],
  "required_next_actions": [],
  "audit_ref": "rwa:fund_alpha:SG:v1"
}
```

## Submission Package

Use `SUBMISSION.md` as the public Google Doc body. Add screenshots from `screenshots/` after running each step.

## Sources

- Terminal3 ADK overview: https://docs.terminal3.io/developers/adk/overview/what-is-adk
- Quickstart: https://docs.terminal3.io/developers/adk/get-started/quickstart
- Dev environment: https://docs.terminal3.io/developers/adk/get-started/prerequisites/set-up-dev-env
- z-namespace: https://docs.terminal3.io/developers/adk/get-started/what-is-z-namespace
- Walkthrough: https://docs.terminal3.io/developers/adk/get-started/walkthrough/write-contract
