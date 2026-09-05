# Development Setup

This guide walks through setting up Solvora Engine for local development on macOS, Linux, and Windows (WSL2).

---

## Prerequisites

| Tool | Version | Purpose |
|---|---|---|
| **Git** | Any | Version control |
| **Node.js** | 20+ (LTS) | Runtime |
| **npm** | 10+ | Package manager |

A testnet-funded account is required only for the attestation flow (report generation and
indexing are read-only).

### 1. Install Node.js

Use [nvm](https://github.com/nvm-sh/nvm) (macOS/Linux) or the official installer (Windows):

```bash
nvm install 20
nvm use 20
```

### 2. Clone and install

```bash
git clone https://github.com/thegreatfeez/solvora-engine.git
cd solvora-engine
cp .env.example .env
npm ci
```

### 3. Fill in `.env`

```env
SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
NETWORK_PASSPHRASE=Test SDF Network ; September 2015
ENTITY_REGISTRY_ADDRESS=<deployed entity-registry id>
ATTESTATION_ADDRESS=<deployed attestation id>
# Only needed for POST /entities/:id/attest:
ENTITY_OWNER_SECRET_KEY=<entity owner secret key — NEVER commit this>
```

> The secret key signs attestations as the entity owner. Keep it out of any shared
> environment, and never commit it. Read-only features (indexing, reports) work without it.

---

## Run

| Task | Command | Notes |
|---|---|---|
| Start API (dev, hot reload) | `npm run dev` | http://localhost:3000 |
| Run the indexer | `npm run index` | One pass; run in a loop or cron for continuous indexing |
| Typecheck | `npm run typecheck` | `tsc --noEmit` |
| Lint | `npm run lint` | eslint |
| Test | `npm test` | vitest |
| Build | `npm run build` | `tsc` emit to `dist/` |

Verify the API is up: `curl localhost:3000/health`.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `RPC` errors on startup | Confirm `SOROBAN_RPC_URL` and `NETWORK_PASSPHRASE` match (testnet) |
| `ENTITY_NOT_FOUND` on reports | The entity must be registered in the on-chain `entity-registry` first (use the dashboard) |
| Attestation returns 403 | The configured `ENTITY_OWNER_SECRET_KEY` must belong to the entity's `owner` |
| Port 3000 in use | Set `PORT=3001` in `.env` |

Questions? Ask in the [solvora-meta discussions](https://github.com/thegreatfeez/solvora-meta/discussions).