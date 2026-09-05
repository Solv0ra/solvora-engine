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

## 7. Production (future)

Postgres instead of SQLite, an archival RPC (Mercury or self-hosted node), and the API
behind HTTPS with auth for `POST /entities/:id/attest` (Wave 2 hardening).

---

## Rollback

The engine writes only derived state; reverting a bad deploy means re-running the indexer
with the previous code — reports recompute identically (deterministic pipeline). No data
migration is ever required for engine-level rollbacks.