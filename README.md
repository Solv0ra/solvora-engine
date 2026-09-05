# Solvora Engine

[![Engine CI](https://github.com/thegreatfeez/solvora-engine/actions/workflows/ci-engine.yml/badge.svg)](https://github.com/thegreatfeez/solvora-engine/actions/workflows/ci-engine.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
<!-- ALL-CONTRIBUTORS-BADGE:START - Do not remove or modify this section -->
[![All Contributors](https://img.shields.io/badge/all_contributors-0-orange.svg?style=flat-square)](#contributors-)
<!-- ALL-CONTRIBUTORS-BADGE:END -->

**The off-chain brain of Solvora — indexes Soroban ledger activity, turns it into accounting reports, and anchors them on-chain.**

---

## The Problem

On-chain data is raw, noisy, and protocol-specific. A treasury holds balances; an AMM
mints, burns, and swaps; a lending market accrues interest. Turning that raw ledger noise
into something a CFO, an auditor, or a DAO can actually read — a balance sheet, a cash
flow statement — is a bespoke engineering project for every protocol. And once you have a
report, you still need to prove it matches reality.

Solvora Engine is the pipeline that makes this repeatable:

- **Indexer** — watches Soroban for ledger changes on registered entity addresses
- **Adapters** — protocol-aware parsers that turn raw events into accounting entries
- **Accounting engine** — standard reports (balance sheet, cash flow) from those entries
- **Attestation client** — anchors report hashes on-chain via the Solvora `attestation` contract
- **API** — serves the dashboard, including the backend-driven module registry

---

## What Solvora Engine Does

```
Soroban RPC ──► Indexer ──► Adapter(s) ──► Accounting entries ──► Reports
                                                                    │
                                                                    ▼
                                     Attestation client ──► attestation contract (on-chain anchor)
                                                                    │
                                                                    ▼
Dashboard ◄──────────────────────────── API (reports, /modules) ───┘
```

**Key properties:**

- **Protocol-aware by adapter** — each `EntityType` has an adapter; adding a protocol = adding an adapter, not a rewrite
- **Standard accounting outputs** — balance sheet and cash flow from day one
- **Backend-driven module registry** — the frontend renders whatever `/modules` returns, so "coming soon" modules need no frontend redesign
- **On-chain attestation** — every report can be hashed and anchored via the Solvora contracts
- **Read-only, verifiable** — the engine never writes state it can't re-derive from the ledger

---

## Live Deployment (Testnet)

| | |
|---|---|
| **API base URL** | TBD (deployed with Phase 2 of the build plan) |
| **Module registry** | `GET /modules` |
| **Contracts** | [solvora-contracts](https://github.com/thegreatfeez/solvora-contracts) |
| **Dashboard** | [solvora-dashboard](https://github.com/thegreatfeez/solvora-dashboard) |

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│  soroban RPC (testnet.stellar.org)                               │
│    getEvents / getLedgerEntries / simulateTransaction            │
└──────────────────────────┬───────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│  Indexer (polls registered entity addresses, stores raw events)  │
│                                                                  │
│  ┌────────────────┐   ┌──────────────┐   ┌───────────────────┐  │
│  │ LedgerAdapter  │──►│  Accounting  │──►│  Report types     │  │
│  │  (per entity   │   │  engine      │   │  balance_sheet    │  │
│  │   type)        │   │  (entries →  │   │  cash_flow        │  │
│  │                │   │   statements)│   │  … (stubbed)      │  │
│  └────────────────┘   └──────────────┘   └───────────────────┘  │
└──────────────────────────┬───────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│  API layer (REST)                                                │
│  /modules · /entities · /reports · /attestations                 │
└──────────────────────────┬───────────────────────────────────────┘
                           │
                           ▼
                  solvora-dashboard (Next.js)
```

Full details: [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)

---

## Repository Layout

```
src/
  indexer/        Soroban RPC polling + raw event storage
  adapters/       LedgerAdapter implementations (GenericTreasuryAdapter first)
  accounting/     Entry → report transformations (balance sheet, cash flow)
  attestation/    Report hash + on-chain anchor submission
  api/            REST layer incl. /modules registry
  types/          Shared types (entry, report, entity, module registry)
  config/         Env-driven configuration
docs/             Architecture, API reference, setup, security, deployment
tests/            Unit + integration tests
.github/workflows/  CI: typecheck, lint, tests
```

---

## Getting Started

> **New contributors:** See [`docs/SETUP.md`](./docs/SETUP.md) for full environment setup on macOS, Linux, and Windows (WSL2).

### 1. Clone and install

```bash
git clone https://github.com/thegreatfeez/solvora-engine.git
cd solvora-engine
cp .env.example .env
npm ci
```

### 2. Fill in your `.env`

```env
SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
NETWORK_PASSPHRASE=Test SDF Network ; September 2015
ENTITY_REGISTRY_ADDRESS=<deployed entity-registry id>
ATTESTATION_ADDRESS=<deployed attestation id>
```

### 3. Run the API

```bash
npm run dev
```

### 4. Run the indexer (once per interval or as a loop)

```bash
npm run index
```

### 5. Run the tests

```bash
npm test
```

---

## API Endpoints (MVP)

| Method | Path | What it does |
|---|---|---|
| `GET` | `/modules` | Module registry — drives the dashboard's module switcher |
| `GET` | `/entities` | Registered entities (from the on-chain registry) |
| `GET` | `/entities/:id` | One entity with its indexed activity summary |
| `GET` | `/entities/:id/reports?type=balance_sheet&from=&to=` | A report for an entity |
| `POST` | `/entities/:id/attest` | Generates + hashes a report, submits the on-chain anchor |
| `GET` | `/entities/:id/attestations` | On-chain attestation history |

Full API reference: [`docs/API.md`](./docs/API.md)

---

## Common Commands

| Task | Command |
|---|---|
| Install deps | `npm ci` |
| Run API (dev) | `npm run dev` |
| Run indexer | `npm run index` |
| Typecheck | `npm run typecheck` (tsc --noEmit) |
| Lint | `npm run lint` |
| Test | `npm test` |
| Build | `npm run build` |

---

## Roadmap

### Near-term
- [ ] Soroban RPC indexer (read-only, store raw events)
- [ ] `GenericTreasuryAdapter` + accounting engine (balance sheet, cash flow)
- [ ] API layer incl. `/modules` registry

### Mid-term
- [ ] AMM adapter (parses swaps/mints/burns into entries)
- [ ] Lending-market adapter (interest accrual, liquidations)
- [ ] Income statement report type

### Long-term
- [ ] Multi-entity consolidation reports
- [ ] Reconciliation checks (computed entries vs. raw on-chain balances)
- [ ] Production indexer (Mercury or archival-node based)

---

## Contributing

Solvora Engine welcomes contributions of all kinds — adapters, report types, tests,
documentation, and bug fixes.

**Start here:** [`docs/CONTRIBUTING.md`](./docs/CONTRIBUTING.md)

---

## Contributors

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->
<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind welcome!

---

## Security

This engine is **unaudited**. It is read-only with respect to user funds (it never holds
tokens), but a compromised engine could anchor false attestations — see
[`docs/SECURITY.md`](./docs/SECURITY.md) for the threat model.

---

## License

MIT — see [LICENSE](./LICENSE)