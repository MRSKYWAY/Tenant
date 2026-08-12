# Terminal3 ADK Testnet Submission

This repo contains a fast, reproducible Terminal3 ADK onboarding run:

- TypeScript quickstart/authentication script
- Tenant client readiness check
- Reference TEE contract checkout/build instructions
- Registration and invocation scripts
- Screenshot and bug-report checklist
- Initial use-case proposal for bonus judging

## Status

The project is prepared for the Terminal3 ADK testnet flow. Runtime completion needs the SSO-created credentials from the claim page:

- `T3N_API_KEY`: tenant private API key
- `AGENT_KEY`: separate agent key for walkthrough invocation
- `USER_KEY`: separate user/data-owner key for walkthrough authorization
- `DUFFEL_API_KEY`: Duffel test API key for the reference flight contract secret

## Quick Run

```bash
cd /home/skye/Tenant/my-t3n-app
cp .env.example .env
# Fill .env locally. Do not commit it.
npm install
npm run quickstart
```

## Contract Build

```bash
cd /home/skye/Tenant
git clone https://github.com/Terminal-3/z-tenant-flight.git
cd z-tenant-flight
rustup target add wasm32-wasip2
cargo build --target wasm32-wasip2 --release
ls -lh target/wasm32-wasip2/release/*.wasm
```

## Registration

```bash
cd /home/skye/Tenant/my-t3n-app
npm run register
```

## Invoke Walkthrough

```bash
cd /home/skye/Tenant/my-t3n-app
npm run invoke
```

## Submission Package

Use `SUBMISSION.md` as the public Google Doc body. Add screenshots from `screenshots/` after running each step.

## Sources

- Terminal3 ADK overview: https://docs.terminal3.io/developers/adk/overview/what-is-adk
- Quickstart: https://docs.terminal3.io/developers/adk/get-started/quickstart
- Dev environment: https://docs.terminal3.io/developers/adk/get-started/prerequisites/set-up-dev-env
- z-namespace: https://docs.terminal3.io/developers/adk/get-started/what-is-z-namespace
- Walkthrough: https://docs.terminal3.io/developers/adk/get-started/walkthrough/write-contract
