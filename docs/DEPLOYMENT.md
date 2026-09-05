# Deployment Guide

This guide covers deploying Solvora Engine to Stellar testnet and wiring it to the contract
IDs from [solvora-contracts DEPLOYMENT.md](https://github.com/Solv0ra/solvora-contracts/blob/main/docs/DEPLOYMENT.md).

## Prerequisites

- Node 20+, `npm ci` completed, `.env` configured per [SETUP.md](./SETUP.md)
- Deployed `entity-registry` and `attestation` contract IDs

---

## 1. Configure the environment

```env
PORT=3000
SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
NETWORK_PASSPHRASE=Test SDF Network ; September 2015
ENTITY_REGISTRY_ADDRESS=<id from contracts deploy>
ATTESTATION_ADDRESS=<id from contracts deploy>
ENTITY_OWNER_SECRET_KEY=<entity owner key — only for attest>
DATABASE_URL=file:./dev.db
```

## 2. Database

```bash
npx prisma migrate dev   # local SQLite
```

## 3. Run the indexer (one pass)

```bash
npm run index
```

Repeat on a schedule (cron/systemd timer) for continuous indexing; the design is
idempotent, so overlapping runs are safe.

## 4. Run the API

```bash
npm run build
node dist/index.js
# or in dev: npm run dev
```

Verify: `curl localhost:3000/health` and `curl localhost:3000/modules`.

## 5. Register an entity and generate a report

Register the entity via the dashboard (or directly on the `entity-registry` contract — see
[CONTRACT_API.md](https://github.com/Solv0ra/solvora-contracts/blob/main/docs/CONTRACT_API.md)),
then:

```bash
curl -s "localhost:3000/entities/1/reports?type=balance_sheet"
```

## 6. Testnet smoke test in CI

Set `TESTNET_API_URL` as a GitHub repository variable; the CI workflow curls `/health` and
`/modules` on push to `main`.

## 7. Hosting — Railway or Render (testnet now)

The engine is a plain Node ESM service (`type: "module"`): it compiles with `tsc` to
`dist/` and runs with `node dist/index.js`. Any Node host works. Both examples below wire
up the same two commands.

**Build command (both platforms):**
```bash
npm ci && npm run build
```

**Start command (both platforms):**
```bash
npm start    # → node dist/index.js
```

### Railway

1. Push `solvora-engine` to GitHub and create a **New Project → Deploy from GitHub repo**.
2. Railway auto-detects Node; set the **Start Command** to `npm start` (Nixpacks detects
   `package.json` scripts automatically — confirm the preview serves `/health`).
3. Set variables (Settings → Variables):

```env
PORT=3000                     # Railway injects this automatically
SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
NETWORK_PASSPHRASE=Test SDF Network ; September 2015
ENTITY_REGISTRY_ADDRESS=
ATTESTATION_ADDRESS=
```

4. Open the generated `*.up.railway.app` URL → verify `GET /health` and `GET /modules`.

### Render

1. Push to GitHub → **New + → Web Service → Import the `solvora-engine` repo**.
2. **Runtime**: Node (20+); **Build Command**: `npm ci && npm run build`;
   **Start Command**: `npm start`.
3. Add the same environment variables as above (Settings → Environment).
4. Open the `*.onrender.com` URL → verify `/health` and `/modules`.

### Wiring the dashboard

Set the dashboard's `NEXT_PUBLIC_ENGINE_URL` (Vercel project env var) to the deployed
engine URL. The dashboard then fetches `/modules` from the backend; without the variable
it renders the built-in module defaults (see dashboard README).

## 8. Production (future)

Postgres instead of SQLite, an archival RPC (Mercury or self-hosted node), and the API
behind HTTPS with auth for `POST /entities/:id/attest` (Wave 2 hardening).

---

## Rollback

The engine writes only derived state; reverting a bad deploy means re-running the indexer
with the previous code — reports recompute identically (deterministic pipeline). No data
migration is ever required for engine-level rollbacks.