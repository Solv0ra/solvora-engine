# Security Policy — Solvora Engine

## Supported Versions

| Version | Supported |
|---|---|
| testnet (current) | Yes |
| mainnet | Not yet deployed — audit pending |

## Threat Model

The engine is **read-only with respect to user funds** — it never holds tokens and never
signs transfers. Its trust boundary is different from a contract's:

| Asset | Risk | Mitigation |
|---|---|---|
| **Attestation integrity** | A compromised engine anchors false reports | Attestation is owner-gated on-chain (`require_auth`); a stolen engine key alone cannot attest for entities it doesn't own |
| **Report accuracy** | Buggy adapter misclassifies events | Adapters are unit-tested against fixture events; reconciliation checks (entries vs. raw balances) are planned for Wave 2 |
| **Data availability** | Engine down = no reports | Dashboard shows 503 `INDEXER_LAGGING`; indexer resumes from last processed ledger |
| **Secret exposure** | `ENTITY_OWNER_SECRET_KEY` leaked | Key kept out of env templates beyond `.env`; never committed; rotation = re-attest |

## Reporting a Vulnerability

Report privately via GitHub Security Advisories on this repository — do **not** open a
public issue. Include: endpoint/adapter affected, minimal repro (request + env sketch), and
impact assessment. Acknowledgment within 72 hours.

## Deployment Hygiene

- The API and indexer run as separate processes; the indexer needs no secret key.
- Never log `ENTITY_OWNER_SECRET_KEY` or derived signatures.
- CI runs `npm audit` on the lockfile; advisories block merges.

## Related

- [ARCHITECTURE.md](./ARCHITECTURE.md) — pipeline and trust boundaries
- [DESIGN.md](./DESIGN.md) — design decisions incl. source-of-truth rule
- contracts [SECURITY.md](https://github.com/thegreatfeez/solvora-contracts/blob/main/docs/SECURITY.md) — on-chain risk model