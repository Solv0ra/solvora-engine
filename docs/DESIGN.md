# Solvora Engine — Design Decisions

This document records the reasoning behind key choices in Solvora Engine. Its purpose is to
help contributors and auditors evaluate proposed changes against original intent.

---

## 1. Adapter framework, not a monolith

**Decision:** protocol understanding lives in `LedgerAdapter` implementations keyed by
`EntityType`.

**Why:** the long-term product spans treasuries, AMMs, lending markets, and more. A single
parser would grow unbounded and make every protocol addition a full-pipeline change.
Adapters isolate protocol knowledge behind one interface, so Wave 2+ additions are ~3–5
issues each (parser, edge cases, tests, docs) rather than a rewrite.

**Trade-off:** an adapter per protocol means duplicate plumbing; mitigated by shared entry
types and accounting logic.

## 2. TypeScript for the engine

**Decision:** TypeScript (Node) rather than Rust.

**Why:** MVP speed — the SDK ecosystem (`@stellar/stellar-sdk`), fast iteration, and
recruiting contributors who don't need Rust for backend work. The report/API surface is
I/O-bound; no hot path needs Rust in the MVP.

**Trade-off:** hot paths (heavy re-indexing) may warrant a Rust port later; the pipeline
contract (entries, reports, canonicalization) is language-agnostic by design, so a port
does not leak into the API contract.

## 3. Idempotent, deterministic pipeline

**Decision:** entries are keyed by `(ledger, eventIndex)` and upserted; reports are computed
on demand from raw events, never cached as the source of truth.

**Why:** the product's core value is *verifiability*. If reports depended on transient
indexer state, two runs could disagree. Deterministic derivation means re-indexing always
reproduces the same report — and the canonical hash verifies on-chain.

**Trade-off:** report generation is O(events) per request; acceptable for MVP scale,
optimized later with materialized aggregates.

## 4. Backend-driven module registry

**Decision:** the frontend learns about modules (live vs. coming-soon) exclusively from
`GET /modules`.

**Why:** the "platform with more coming" framing must never drift between frontend and
backend. A single registry makes a new module a backend config change + routes, and locked
modules stay visibly designed without dead frontend routes.

**Trade-off:** an endpoint as a source of UI truth is unusual; mitigated by a typed client
in the dashboard that consumes the registry tightly.

## 5. Attestation binds canonically, not raw JSON

**Decision:** SHA-256 over a deterministically canonicalized payload.

**Why:** the same logical report must hash identically across engine versions, languages,
and re-verification tools. Raw JSON serialization is not stable.

**Trade-off:** consumers must implement canonicalization; documented in ARCHITECTURE §4 and
API.md, plus SDK helpers ship with the first report wave.

## 6. SQLite for MVP storage

**Decision:** file-backed SQLite via Prisma; Postgres is the documented production path.

**Why:** zero-ops local indexing and tests; the dataset is small (raw events for a handful
of entities). Postgres only pays off at scale.

**Trade-off:** single-writer constraint; fine for one indexer process.

## 7. On-chain contracts remain the source of truth

**Decision:** the engine caches entities and attestations but always re-validates reads
against Soroban RPC before producing reports or submitting attestations.

**Why:** a compromised or corrupt engine DB must not produce reports that contradict the
ledger. The attestation contract's owner-gated submit is the last line of defense.

**Trade-off:** an extra RPC round-trip per read; cheap on testnet, acceptable on mainnet.

## 8. 501 for stubbed report types, not 404

**Decision:** unimplemented report types and adapters return `501 REPORT_TYPE_NOT_IMPLEMENTED`
with a clear "coming in a later wave" message.

**Why:** keeps the "more coming" narrative visible end-to-end and makes the extension
surface discoverable to contributors — same rationale as Accord's visible stubs.

**Trade-off:** slightly more docs/API surface to maintain.

---

## Related Documents

- [ARCHITECTURE.md](ARCHITECTURE.md) — pipeline, data model, module registry
- [API.md](API.md) — endpoint reference
- [SECURITY.md](SECURITY.md) — threat model