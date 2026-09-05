# Solvora Engine — API Reference

Base path: `/` (V1). All responses are JSON. Read endpoints are public on testnet; write
endpoints (`POST /entities/:id/attest`) require admin auth until the engine ships a proper
auth story (Wave 2 — see SECURITY.md).

## Common Response Shape

```
200 OK
{ "data": { ... } }

4xx/5xx
{ "error": { "code": "ENTITY_NOT_FOUND", "message": "..." , "details": { ... } } }
```

## Endpoints

### `GET /health`

Liveness + indexer status.

```json
{ "status": "ok", "lastIndexedLedger": 123456, "indexerLagLedgers": 3 }
```

### `GET /modules`

Module registry — the dashboard renders whatever this returns (see ARCHITECTURE §3).

```json
{
  "data": [
    { "id": "reporting",        "name": "Financial Reporting",      "status": "live" },
    { "id": "risk-monitor",     "name": "Invariant / Risk Monitor", "status": "coming_soon" },
    { "id": "proof-of-reserve", "name": "Proof of Reserve",         "status": "coming_soon" }
  ]
}
```

### `GET /entities`

All registered entities (synced from the on-chain `entity-registry`).

```json
{
  "data": [
    {
      "id": 1,
      "owner": "G...",
      "label": "Acme Treasury",
      "entityType": "Treasury",
      "contractAddresses": ["C...", "G..."],
      "createdAt": 1730000000
    }
  ]
}
```

### `GET /entities/:id`

One entity + a summary of indexed activity (total inflow/outflow, last indexed ledger).

### `GET /entities/:id/reports?type=balance_sheet&ledger=N`

| Query | Required | Notes |
|---|---|---|
| `type` | yes | `balance_sheet` or `cash_flow` (anything else → `501` with a "coming soon" message) |
| `ledger` | for balance_sheet | Snapshot ledger; defaults to latest indexed |
| `from`,`to` | for cash_flow | Unix seconds range; defaults to trailing 30 days |

Response is a `Report` (see ARCHITECTURE §4) including `canonicalHash`.

### `POST /entities/:id/attest`

Generates the current report, computes the canonical hash, and submits it to the on-chain
`attestation` contract as the entity owner.

Request:

```json
{ "reportType": "balance_sheet", "ledgerSequence": 123456 }
```

Response:

```json
{
  "data": {
    "attestationId": 42,
    "reportHash": "0x...",
    "ledgerSequence": 123456,
    "status": "submitted"
  }
}
```

Requires the entity owner's key configured in the engine environment (see SETUP.md /
DEPLOYMENT.md). Returns `403 ATTESTATION_NOT_AUTHORIZED` if the configured signer is not
the entity owner.

### `GET /entities/:id/attestations`

On-chain attestation history for the entity (mirrored from the contract).

## Error Codes

| Code | HTTP | Meaning |
|---|---|---|
| `ENTITY_NOT_FOUND` | 404 | Entity id does not exist on-chain |
| `REPORT_TYPE_NOT_IMPLEMENTED` | 501 | Stubbed report type — "coming in a later wave" |
| `INVALID_PERIOD` | 400 | `from` > `to`, or period too wide (max 366 days) |
| `ATTESTATION_NOT_AUTHORIZED` | 403 | Signer is not the entity owner |
| `INDEXER_LAGGING` | 503 | Entity has no indexed data yet |
| `INTERNAL` | 500 | Unexpected error |

## Verification Example (re-verify an attestation)

```bash
# 1. Fetch attestation
curl -s localhost:3000/entities/1/attestations

# 2. Recompute the canonical hash locally (same rules as ARCHITECTURE §4):
node -e '
  const crypto = require("crypto");
  const canonical = JSON.stringify({
    entity_id: 1,
    ledger_sequence: 123456,
    report_type: "balance_sheet",
    report_json: require("./report.json")
  }, Object.keys({...require("./report.json")}).sort());
  console.log(crypto.createHash("sha256").update(canonical).digest("hex"));
'
# 3. Compare with attestation.reportHash — equality means the report is authentic.
```

(Official SDK helpers for canonicalization ship with the first report wave.)

## Module Registry Contract

The registry is the only place the frontend learns about modules. Contract across repos:

| Status | Frontend behavior |
|---|---|
| `live` | Route + nav item rendered |
| `coming_soon` | Locked card with name + backend-provided `description`, no dead route |
| (absent) | Never renders anything about the module |