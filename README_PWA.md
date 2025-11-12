# Growth Journal — PWA

This repository contains the Growth Journal Progressive Web App: a client-side app built with TypeScript, Web Components and Parcel, designed for offline-first journaling with an IndexedDB-backed service worker.

Key features

- Daily journaling and reflections
- Offline-first UX via Service Worker + IndexedDB
- Installable PWA with manifest and icons
- Small, reusable Web Components

Quick start

```powershell
npm install
npm run dev
```

Build for production (with PWA assets)

```powershell
npm run build:pwa
```

Notes

- Icons live in `src/icons/` and are copied into `dist/` during `build:pwa`.
- Service worker code is in `src/sw.ts` and is registered in `src/index.ts`.

If you're reviewing the codebase, start with `src/index.ts`, `src/sw.ts`, and `src/data/IndexedDbDataService.ts` to understand the offline/data flow.

License: MIT