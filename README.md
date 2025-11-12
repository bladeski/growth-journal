# Growth Journal

A Progressive Web App for daily growth journaling and reflection. This repository contains the client-side PWA: Web Components written in TypeScript, built with Parcel, and designed for offline-first usage via a Service Worker and IndexedDB.

Short quick-start

1. Install

```powershell
npm install
```

2. Develop

```powershell
npm run dev
```

3. Build

```powershell
npm run build:pwa
```

4. Lint/format

```powershell
npm run lint
npm run format
```

Project highlights

- PWA-ready: `manifest.json` + `sw.ts` (service worker manages an IndexedDB instance)
- Offline-first data: `src/data/IndexedDbDataService.ts` proxies requests to the service worker
- Web Components: lightweight components under `src/components`
- Seed data: `src/data/GrowthIntentions.ts` contains starter intentions

Project structure (selected files)

- `src/index.pug` — entry HTML template
- `src/index.ts` — app bootstrap and PWA registration
- `src/sw.ts` — service worker (module)
- `src/data` — data services & seed data
- `src/components` — Web Components
- `src/interfaces` — TypeScript interfaces (data shapes)
- `src/styles` — shared CSS variables and styles

If you plan to publish this app, run `npm run build:pwa` and deploy the contents of `dist/` to a static host.

License: MIT