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

## 7. Hosting — free options

Railway has no free tier anymore. The engine is a plain Node ESM service, so these **free**
options work:

### Option A (recommended) — Vercel Hobby, same account as the dashboard

No new account, no credit card. The repo ships a `api/index.ts` serverless entrypoint
(Express app as default export) that Vercel's Node runtime compiles for you.

1. Push `solvora-engine` to GitHub.
2. In Vercel: **Add New → Project → Import `Solv0ra/solvora-engine`**.
   - Framework: **Other** (Vercel detects the `api/` functions automatically; no build
     command needed).
3. Add environment variables (Project → Settings → Environment Variables):
   - `SOROBAN_RPC_URL=https://soroban-testnet.stellar.org`
   - `NETWORK_PASSPHRASE=Test SDF Network ; September 2015`
4. Deploy. Verify `GET https://<your-app>.vercel.app/health` and `/modules`.

Then set the dashboard's `NEXT_PUBLIC_ENGINE_URL` to that URL and redeploy the dashboard.

> Free-tier caveats: serverless cold starts (~1s) and a request limit — irrelevant at
> this scale. `/health` and `/modules` respond in ms.

### Option B — Render free tier

Render's free web service (no credit card, 750 hrs/month; sleeps after 15 min idle and
cold-starts on request):

- New Web Service → repo `solvora-engine`
- Build: `npm ci && npm run build` — Start: `npm start`
- Env: same two variables as Option A

### Option C — Koyeb free tier

Koyeb offers a free web service tier without a credit card; same build/start commands.

### Not free

Railway (free tier removed), Heroku, Fly.io (requires a billing method).

## 8. Wiring the dashboard

Set the dashboard's `NEXT_PUBLIC_ENGINE_URL` (Vercel project env var) to the deployed
engine URL. The dashboard then fetches `/modules` from the backend; without the variable
it renders the built-in module defaults (see dashboard README).

## 9. Production (future)

Postgres instead of SQLite, an archival RPC (Mercury or self-hosted node), and the API
behind HTTPS with auth for `POST /entities/:id/attest` (Wave 2 hardening).

---

## Rollback

The engine writes only derived state; reverting a bad deploy means re-running the indexer
with the previous code — reports recompute identically (deterministic pipeline). No data
migration is ever required for engine-level rollbacks.