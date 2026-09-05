# Changelog

Contributors: add new work under `Unreleased` using the `Added`, `Changed`, `Fixed`, and
`Removed` subsections, then move those entries into a version section when a release is cut.

All notable changes to this project will be documented in this file. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Added
- Repository skeleton: README, LICENSE, docs (ARCHITECTURE, API, DESIGN, SETUP, DEPLOYMENT,
  SECURITY), CI workflow, `express` app with `/health` and `/modules` endpoints.
- Module registry config as the single source of truth for the dashboard's module switcher.
- Adapter framework interface with visibly-stubbed `GenericTreasuryAdapter`,
  `AmmAdapter`, and `LendingMarketAdapter` (NotImplemented errors with clear messages).

### Changed
- No changes yet.

### Fixed
- No fixes yet.

### Removed
- Nothing removed.

## [0.1.0]

Pre-release — skeleton only. Indexer, adapters, accounting engine, and reports not yet
implemented.