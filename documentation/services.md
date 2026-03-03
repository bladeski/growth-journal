# Services

## Data service
- `src/services/data.service.ts`: loads dictionaries/templates/maps; used by helpers and runtime translation plumbing.
- Outputs feed into `build-dictionaries.js` for packaged dictionaries under `dev-dist/data/dictionaries/`.

## Journal service
- `src/services/journal.service.ts`: orchestrates journal data (entries, sections, persistence wiring).

## Storage helpers
- `src/storage/indexeddb.ts`, `src/storage/idb-helpers.ts`, `src/storage/local.ts`, `src/storage/index.ts`: IndexedDB-first storage with local fallback helpers.

## Usage patterns
- Consume services via their exported functions; keep components lean by delegating data access/persistence here.
- When adding new data flows, prefer extending services rather than calling storage layers directly from components.

## Dev commands
- Rebuild dictionaries after changing dictionary data: `yarn run build:dictionaries:dev`.
- Run tests to validate changes: `yarn test` (or the configured project command).
