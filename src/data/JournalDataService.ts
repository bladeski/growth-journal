// JournalDataService removed
//
// This project now uses the service-worker-backed IndexedDbDataService for all
// data storage and retrieval. The original API-backed service and helper
// signatures were removed to make the application offline-first: seed the
// local IndexedDB from `src/data/GrowthIntentions` at startup and perform all
// reads/writes through `IndexedDbDataService`.

// If you need a server-sync adapter in the future, implement a separate
// synchronization module that reads from IndexedDB and syncs with the server
// — do not re-introduce API calls from component-level code.
