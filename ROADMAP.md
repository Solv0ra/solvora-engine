# Roadmap

Solvora Engine turns Soroban ledger noise into verifiable financial reports. Priorities in
order: pipeline integrity, then protocol breadth, then scale. Each milestone ships only
when every acceptance criterion is met.

## Current status

Working toward **v0.1.0** (below). Issues tracked in
[solvora-meta issue-tracker](https://github.com/thegreatfeez/solvora-meta/blob/main/issue-tracker.md).

---

## v0.1.0 — Reporting pipeline (MVP)

**Theme:** the core pipeline from raw ledger to attestable report.

**Targeted features:**

- Soroban RPC indexer (read-only, raw event storage)
- `GenericTreasuryAdapter` + accounting engine (balance sheet, cash flow)
- API layer incl. `/modules` registry
- Attestation client wired to the `attestation` contract

**Acceptance criteria:**

- [ ] Indexer stores raw events idempotently and resumes from last processed ledger
- [ ] `GET /entities/:id/reports?type=balance_sheet|cash_flow` returns correct data from testnet
- [ ] `GET /modules` drives the dashboard switcher (live + two coming-soon modules)
- [ ] Attestation submit works for the entity owner and records ask on-chain
- [ ] All tests pass (`npm test`), typecheck and lint clean

## v0.2.0 — Protocol breadth

**Theme:** more entity types, more report types.

**Targeted features:**

- AMM adapter (swaps, mints, burns)
- Lending-market adapter (interest accrual, liquidations)
- Income statement report type
- Reconciliation checks (computed entries vs. raw on-chain balances)

## v0.3.0 — Hardening & scale

**Targeted features:**

- Postgres storage, archival RPC (Mercury or archival node)
- API auth for attestation endpoint
- Multi-entity consolidation

## v1.0.0 — Mainnet

**Targeted features:**

- Mainnet-ready deployment, observability, runbooks
- SDK helpers for canonical report hashing (JS/TS and Rust)

---

## Explicit non-goals (MVP)

- Storing or managing user funds (engine is read-only)
- Trusting engine DB over on-chain contracts
- Non-deterministic report generation