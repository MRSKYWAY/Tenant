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

## Data Boundary

Raw PII remains in the Terminal3 data layer and is substituted into outbound provider calls inside the TEE. The agent and issuer receive only decision outputs.
