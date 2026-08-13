# Bonus Use Case: Confidential RWA Onboarding Agent

## Problem

Real-world asset platforms need to verify user eligibility before allowing subscriptions, transfers, or redemptions. Today that often means the platform, issuer, and service providers each receive more raw PII than they actually need.

## Terminal3 ADK Approach

Build a tenant-owned TEE contract that lets a delegated AI agent complete onboarding without seeing raw user data.

The user grants the agent permission to invoke a specific contract and approved outbound hosts. The contract uses profile placeholders for sensitive fields, calls KYC / AML / accreditation APIs from inside the enclave, and returns only:

- Eligibility status
- Required next action
- Provider reference IDs
- Timestamped audit metadata

## Why It Matters

This gives asset issuers a compliance-friendly decision trail while reducing custody of raw PII. It also gives users a reusable identity path across multiple issuers and products.

## First Contract Functions

- `check-eligibility`: verifies jurisdiction and required profile completeness.
- `run-screening`: calls approved providers with placeholder-substituted PII.
- `issue-decision`: returns a compact pass / review / reject result.
- `refresh-status`: re-checks expiring credentials without re-collecting the full profile.

## Implemented Proof Of Concept

This repo includes the first version of the use case in `z-rwa-onboarding/`:

- Rust/WIT Terminal3 contract with `check-eligibility` and `run-screening`.
- Deterministic eligibility decisions for supported jurisdictions, investor type, subscription amount, and attestation status.
- `http-with-placeholders` provider call that injects profile fields host-side instead of accepting raw PII in contract inputs.
- Tenant secret lookup for `rwa_provider_api_key` from `z:<tid>:secrets`.
- Native tests covering eligible, review, reject, raw-PII rejection, and non-WASM screening behavior.
- TypeScript helpers: `npm run register-rwa` and `npm run invoke-rwa`.
- Testnet result: registered as `z:<tid>:rwa-onboarding` and returned an `eligible` decision for `fund_alpha` in `SG`.

## Data Boundary

Raw PII remains in the Terminal3 data layer and is substituted into outbound provider calls inside the TEE. The agent and issuer receive only decision outputs.
