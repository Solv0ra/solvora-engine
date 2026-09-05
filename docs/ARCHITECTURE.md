# Solvora Engine — Architecture

## 1. System Overview

```text
┌──────────────────────────────────────────────────────────────┐
│          Soroban RPC + contracts (testnet.stellar.org)       │
│  getEvents · getLedgerEntries · simulateTransaction          │
└──────────────────────────────┬───────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────┐
│                       Indexer                                │
│  - polls registered entity addresses (from entity-registry)  │
│  - stores raw events / state diffs                           │
└──────────────────────────────┬───────────────────────────────┘
                               │ AccountingEntry[]
                               ▼
┌──────────────────────────────────────────────────────────────┐
│                    Adapter framework                         │
│  LedgerAdapter { entityType, parseEvent → AccountingEntry[] }│
│  - GenericTreasuryAdapter (MVP, live)                        │
│  - AmmAdapter / LendingAdapter (stubbed, NotImplemented)     │
└──────────────────────────────┬───────────────────────────────┘
                               │ entries
                               ▼
┌──────────────────────────────────────────────────────────────┐
│                  Accounting engine                           │
│  balance_sheet · cash_flow (live)                            │
│  income_statement · consolidation (stubbed 501)              │
└──────────────────────────────┬───────────────────────────────┘
                               │ reports
                               ▼
┌──────────────────────────────────────────────────────────────┐
│            API layer (REST)  +  Attestation client           │
│  /modules · /entities · /reports · /attestations             │
│  attest → submit_attestation on solvora-contracts            │
└──────────────────────────────┬───────────────────────────────┘
                               │
                               ▼
                     solvora-dashboard
```

## 2. Component Responsibilities

### 2.1 Indexer

- Polls Soroban RPC (`getEvents`, `getLedgerEntries`) for the address set returned by
  `entity-registry.list_entities_by_owner` / `get_entity().contract_addresses`.
- Persists raw events and state diffs (MVP: SQLite via Prisma; production: Postgres).
- Idempotent by design: re-indexing the same ledger range produces identical
  `AccountingEntry[]` — the report pipeline must never depend on indexing order.

| Concern | Decision |
|---|---|
| Poll interval | Configurable; default 30s (RPC rate-limit aware) |
| Event retention | Raw events retained; reports are computed on demand from them |
| Failure handling | Exponential backoff 1s → 2s → 4s, cap 30s; resume from last processed ledger |

### 2.2 Adapter framework

The extensibility core. Each `EntityType` maps to an adapter that knows how to turn raw
Soroban events into accounting entries:

```ts
interface LedgerAdapter {
  entityType: EntityType;
  parseEvent(rawEvent: SorobanEvent): AccountingEntry[];
}
```

MVP ships exactly **one** adapter: `GenericTreasuryAdapter` (simple transfers/balance
changes for a treasury/multisig — the most universal case). Files for `AmmAdapter` and
`LendingMarketAdapter` exist but throw `NotImplementedError`, so the interface is visible
and contributors see exactly what to build next (Wave 2+ issues).

### 2.3 Accounting engine

Takes `AccountingEntry[]` and produces standard reports:

| Report | Status at MVP | What it contains |
|---|---|---|
| `balance_sheet` | **Live** | Assets held by the entity at a point in time (`getAssetBalances`) |
| `cash_flow` | **Live** | Inflows/outflows over a period (`from` / `to` filters) |
| `income_statement` | Stubbed → `501 Not Implemented` | Explicit "more coming" |
| `consolidation` | Stubbed → `501 Not Implemented` | Multi-entity rollups |

### 2.4 Attestation client

- Computes `SHA-256` over the canonical report payload:
  `{ entity_id, ledger_sequence, report_type, report_json }`
- Submits via `submit_attestation` (entity owner must sign — see contracts docs).
- Recording the anchor is fire-and-forget from the dashboard's perspective; the client
  returns the attestation id for display.

### 2.5 API layer

REST over the report + entity + attestation data. Also exposes the module registry (2.6).

## 3. Module Registry (backend-driven)

The key pattern that keeps "switch between tools, some coming soon" honest across
frontend/backend:

```json
GET /modules
[
  { "id": "reporting",          "name": "Financial Reporting",    "status": "live" },
  { "id": "risk-monitor",       "name": "Invariant / Risk Monitor", "status": "coming_soon" },
  { "id": "proof-of-reserve",   "name": "Proof of Reserve",       "status": "coming_soon" }
]
```

The dashboard renders whatever this endpoint returns — adding a real module in Wave 2 is a
backend config change plus new routes, not a frontend redesign. The registry is built from
a single source (`src/api/moduleRegistry.ts`) so the UI and documentation never drift.

## 4. Data Model

### AccountingEntry

```ts
interface AccountingEntry {
  id: string;                    // deterministic: `${ledger}-${eventIndex}`
  entityId: number;
  entryType: 'inflow' | 'outflow' | 'balance_change';
  asset: string;                 // contract address or native (XLM)
  amount: bigint;                // smallest unit, never floats
  counterparty: string | null;
  ledgerSequence: number;
  timestamp: number;             // ledger close time (Unix seconds)
  raw: SorobanEvent;             // original event, for audit
}
```

### Report

```ts
interface Report {
  entityId: number;
  type: 'balance_sheet' | 'cash_flow';
  generatedAt: number;
  ledgerSequence: number;        // snapshot ledger for balance_sheet
  period: { from: number; to: number } | null; // cash_flow
  rows: ReportRow[];
  totals: Record<string, bigint>;
  canonicalHash: string;         // SHA-256 over canonical payload (see attestation)
}
```

### Canonical serialization (attestation contract)

The hash binds a canonical form, not raw JSON:

1. Object keys sorted lexicographically (recursively).
2. Numbers serialized with a fixed format (no `1e21`, no trailing zeros; amount expressed
   as string in smallest unit).
3. UTF-8, no BOM.
4. `ledger_sequence` is the report snapshot's ledger, not the submission ledger.

Changes to this spec are **breaking for verification** — treat as a schema change with a
migration wave, and update `docs/API.md`'s re-verification example in the same PR.

## 5. Storage

MVP: SQLite (file-backed, zero-ops). Production: Postgres. Tables:

| Table | Purpose |
|---|---|
| `raw_events` | (ledger, event_index) unique; full event XDR JSON |
| `accounting_entries` | Derived entries, idempotent upserts |
| `entities` | Cached copy of on-chain entities (re-synced on read) |
| `attestations` | Mirror of on-chain attestations for fast reads |

The engine never treats its DB as authoritative: on-chain contracts remain the source of
truth for entities and attestations (see contracts ARCHITECTURE §9).

## 6. Error Handling & Observability

- All API errors are JSON: `{ error: { code, message, details? } }`.
- 501 for stubbed report types with a clear "coming in a later wave" message.
- Logging via `pino`; request ids on every API call.
- Indexer emits metrics (last indexed ledger, events/sec, backoff state) via a `/health`
  endpoint for simple ops monitoring.

## 7. Related Documents

| Document | Description |
|---|---|
| [API.md](API.md) | Endpoint reference, error codes, verification example |
| [DESIGN.md](DESIGN.md) | Design decisions and trade-offs |
| [SETUP.md](SETUP.md) | Environment setup |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Deployment guide |
| [SECURITY.md](SECURITY.md) | Threat model |
| contracts [ARCHITECTURE.md](https://github.com/thegreatfeez/solvora-contracts/blob/main/docs/ARCHITECTURE.md) | On-chain storage, events, attestation semantics |