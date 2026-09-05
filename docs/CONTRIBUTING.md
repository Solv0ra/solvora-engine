# Contributing to Solvora Engine

Thank you for contributing! This guide covers the full contributor workflow: environment setup, finding work, opening pull requests, and code standards.

Read the [README](../README.md) and [Architecture](./ARCHITECTURE.md) for product context first.

---

## Ways to contribute

- **Adapters** — new `LedgerAdapter` implementations (AMM, lending, …)
- **Report types** — accounting engine transforms (income statement, consolidation, …)
- **API surface** — endpoints, validation, error handling
- **Tests** — unit, integration, fixture-based adapter tests
- **Docs** — API reference, tutorials

## Finding work

Issues are coordinated through **solvora-meta**
(issues.md and issue-tracker.md in the local solvora-meta coordination repo).
Pick an issue labeled `engine`, claim it, and follow the workflow below.

## Development workflow

```bash
git clone https://github.com/Solv0ra/solvora-engine.git
cd solvora-engine
cp .env.example .env
npm ci

git checkout -b feat/123-amm-adapter
npm run typecheck
npm run lint
npm test
git commit -m "feat: add AMM adapter parsing swaps and liquidity events"
git push -u origin feat/123-amm-adapter
```

## Branch naming and commits

Branches: `<type>/<issue-number>-<short-slug>` (`feat/`, `fix/`, `docs/`, `test/`, `chore/`).
Commits: Conventional Commits, imperative mood, lowercase.

## Code standards

- TypeScript strict mode; no `any` (documented exceptions only).
- BigInt for all amounts — never `number` for token values.
- No comments restating code; document *why*.
- New endpoints update `docs/API.md` in the same PR.
- New adapters ship with: parser, edge-case tests, fixture events, doc entry.

## Testing

```bash
npm test            # vitest, all units
npm run typecheck
npm run lint
```

Adapter changes require fixture-based tests (event XDR JSON) covering happy path, unknown
events, and malformed payloads.

## CI checks that must pass

| Check | Command (CI) |
|---|---|
| Typecheck | `npm run typecheck` |
| Lint | `npm run lint` |
| Tests | `npm test` |
| Deps | `npm audit --omit=dev` |

The CI workflow is `.github/workflows/ci-engine.yml`. Fix failures before requesting review.