# Growth Journal

Growth Journal is a Progressive Web App (PWA) for daily growth journaling and reflection. It's built with TypeScript and Web Components, bundled with Parcel, and designed to work offline using a Service Worker and IndexedDB.

[![codecov](https://codecov.io/gh/bladeski/growth-journal/branch/main/graph/badge.svg)](https://codecov.io/gh/bladeski/growth-journal)
[![Playwright report](https://img.shields.io/badge/playwright-report-blue)](https://bladeski.github.io/growth-journal/playwright-report/)

<!-- CI trigger: tiny edit to rerun workflow -->
## Quick start

1. Install dependencies

```powershell
npm install
```

2. Run in development (Parcel dev server)

```powershell
npm run dev
```

3. Build a production PWA

```powershell
npm run build:pwa
```

4. Lint and format

```powershell
npm run lint
npm run format
```

## What this project contains

- PWA integration: `manifest.json` + `src/sw.ts` (service worker that coordinates data storage and sync)
- Offline-first data layer: `src/data/IndexedDbDataService.ts` delegates to the service worker via postMessage/MessageChannel
- Web Components: modular UI components live in `src/components`
- Seed & example data: `src/data/GrowthIntentions.ts` and migration helpers
- TypeScript interfaces: shared shapes in `src/interfaces`

## Selected files

- `src/index.pug` — HTML entry template
- `src/index.ts` — app bootstrap & PWA registration
- `src/sw.ts` — service worker; message-based RPC handler for IndexedDB
- `src/data` — data services and migration code
- `src/components` — Web Components
- `jest.config.cjs` — unit test configuration (ts-jest, ESM-aware)

## Key features

- Offline journaling: morning/midday/evening check-ins, weekly/monthly reviews are stored locally and synced via the service worker
- IndexedDB-backed storage: the service worker exposes a small RPC (message types prefixed with `IDB:`) to read/write stores
- PWA install flow: `PWAManager` handles the beforeinstallprompt flow and the UI to let users install the app
- Small, focused components so the UI can be reused or embedded elsewhere

## Testing

This repository uses Jest (with `ts-jest`) for unit tests and Playwright for end-to-end tests.

- Unit tests (run locally):

```powershell
npm run test:unit
```

This runs Jest with an ESM-friendly invocation. The project treats `.ts` files as ESM for testing (see `jest.config.cjs`) and uses a small TypeScript test shim `tests/jest/setupTests.ts` to provide `TextEncoder`/`TextDecoder` in the jsdom environment.

- CI-friendly unit run (used in GitHub Actions):

```powershell
npm run test:unit:ci
```

This uses the same ESM invocation but runs in-band for stable CI output. The GitHub Actions workflow is configured to use Node.js 20 to match the ESM runtime.

- End-to-end tests (Playwright):

```powershell
npm run test:e2e
```

Playwright tests expect the dev server to be running (the CI workflow starts the dev server in the background before E2E tests).

## Troubleshooting & notes

- Experimental VM modules warning: when running the ESM Jest invocation you'll see Node's experimental VM Modules warning. This is expected because Jest is being launched under Node's `--experimental-vm-modules` flag to support ESM TypeScript via `ts-jest`.
- Node version: CI runs on Node 20; if you see unexpected module/loader errors locally, try using Node 20 as well.
- Test shims: `tests/jest/setupTests.ts` provides global shims required by jsdom and the tests (TextEncoder/TextDecoder). Keep that file in place when adding new tests that rely on binary/text encoding.
- Coverage: running the unit tests collects coverage to the `coverage/` directory.

## Reports

- **Unit test coverage:** The CI run uploads coverage to Codecov. You can view the project coverage and per-PR coverage diffs at the Codecov dashboard linked in the badge above. Locally run `npm run test:unit:ci` and open `coverage/lcov-report/index.html` to inspect a local HTML report.

Note: if this repository is private or your Codecov account requires an upload token, add a `CODECOV_TOKEN` secret to the repository (Settings → Secrets → Actions) so the `codecov` action can upload coverage.

- **Playwright HTML report & traces:** The Playwright HTML report is published to GitHub Pages at `/playwright-report/` after a successful E2E CI run (badge above points there). You can also download Playwright trace `.zip` artifacts from any Actions run and view them locally with `npx playwright show-trace path/to/trace.zip`.

## Contributing

Contributions are welcome. If you plan to add new features or tests:

1. Open an issue describing the change.
2. Create a branch and a small PR with focused commits.
3. Run the unit tests and ensure they pass locally (`npm run test:unit`).

## License

MIT