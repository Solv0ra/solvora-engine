# Solvora Engine

The off-chain brain of Solvora — indexes Ethereum activity, turns it into accounting reports,
and serves them over a REST API.

## What it does

- **Indexer** — reads on-chain events for registered entity addresses from an EVM RPC.
- **Adapter framework** — maps each entity type to an adapter that turns raw events into
  accounting entries. The MVP ships `GenericTreasuryAdapter`.
- **Accounting engine** — produces standard reports (balance sheet, cash flow).
- **API** — serves the dashboard, including a `/modules` registry that drives the module
  switcher.

```
Ethereum RPC ──► Indexer ──► Adapter(s) ──► Accounting entries ──► Reports ──► REST API
```

## Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Liveness; reports the last indexed block and lag |
| `GET` | `/modules` | Module registry (single source of truth for the dashboard) |
| `GET` | `/entities` | List all entities from the on-chain `EntityRegistry` |
| `GET` | `/entities/:id` | Fetch one entity |
| `GET` | `/entities/:id/reports?type=balance_sheet\|cash_flow&from=&to=` | Generate a report from indexed on-chain data |

## Setup

```bash
cp .env.example .env
# set SEPOLIA_RPC_URL, ENTITY_REGISTRY_ADDRESS, ATTESTATION_ADDRESS

npm install
npm run dev      # http://localhost:3000
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start with hot reload |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run the compiled build |
| `npm run typecheck` | Type-check without emitting |

## Adding a module

The module registry lives in `src/api/moduleRegistry.ts`. Flipping a module to `live` is a
config change plus new routes — the dashboard renders whatever `/modules` returns.
