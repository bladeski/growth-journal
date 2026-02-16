/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope;

// Load logging proxy dynamically to avoid import-time failures inside the
// Service Worker execution environment. Some logger builds reference DOM
// globals that are unavailable in workers; importing at runtime prevents
// module evaluation from aborting the entire worker script.
let Logger: {
  info: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  debug: (...args: any[]) => void;
  error: (...args: any[]) => void;
} = console;

void import('./sw-logger-proxy.ts')
  .then((mod) => {
    try {
      const LoggingService = (mod as any).LoggingService;
      if (LoggingService && typeof LoggingService.initialize === 'function') {
        LoggingService.initialize({
          applicationName: 'GrowthJournalServiceWorker',
          enableConsoleCore: false,
          autoRegisterIndexedDBAdvancedLogger: true,
        });
      }
      if (LoggingService && typeof LoggingService.getInstance === 'function') {
        Logger = LoggingService.getInstance();
      }
    } catch (e) {
      console.error('Failed to initialize LoggingService in SW', e);
    }
  })
  .catch((e) => {
    console.error('Failed to import sw-logger-proxy in SW', e);
  });

const CACHE_NAME = 'growth-journal-v1';
const urlsToCache = ['/', '/index.html', '/manifest.json'];

// Asset extensions we care to pre-cache when discovered in HTML
const ASSET_EXT = /\.(?:js|css|png|jpg|jpeg|svg|webmanifest|woff2|woff|ttf|json)$/i;

// Install event - cache resources
self.addEventListener('install', (event: ExtendableEvent) => {
  // Normalize cache URLs relative to the service worker script location
  const scopeBase = new URL('.', self.location.href).toString();
  const normalizedUrls = urlsToCache.map((p) => {
    // If it's already an absolute URL, keep it
    try {
      const u = new URL(p);
      if (u.protocol === 'http:' || u.protocol === 'https:') return u.toString();
    } catch (e) {
      // not an absolute URL - fall through
    }
    // Remove any leading slash so resolution is relative to scopeBase (not origin root)
    const trimmed = p.replace(/^\//, '');
    return new URL(trimmed, scopeBase).toString();
  });

  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      // service worker runs in worker scope; use project Logger instance for diagnostics
      Logger.info('Opened cache', { cacheName: CACHE_NAME, base: scopeBase });

      // Try to pre-cache the basic list first
      try {
        await cache.addAll(normalizedUrls);
        Logger.info('Basic assets cached successfully');
      } catch (err) {
        Logger.warn('cache.addAll failed for basic assets, will attempt best-effort adds', {
          error: err,
        });
        for (const url of normalizedUrls) {
          try {
            await cache.add(url);
          } catch (e) {
            Logger.warn('Failed to cache', { url, error: e });
          }
        }
      }

      // Attempt to discover additional assets referenced by index.html (app shell)
      try {
        const indexUrl =
          normalizedUrls.find((u) => u.endsWith('/index.html')) ||
          new URL('index.html', scopeBase).toString();
        const resp = await fetch(indexUrl);
        if (resp && resp.ok) {
          const text = await resp.text();
          const urls = new Set<string>();
          const attrRe = /(?:href|src)=["']([^"']+)["']/gi;
          let m: RegExpExecArray | null;
          while ((m = attrRe.exec(text))) {
            const raw = m[1];
            // ignore absolute external URLs
            try {
              const u = new URL(raw, indexUrl);
              if (u.origin !== self.location.origin) continue;
              // only cache assets with known extensions or in-scope HTML
              if (
                ASSET_EXT.test(u.pathname) ||
                u.pathname.endsWith('.html') ||
                u.pathname.endsWith('manifest.json')
              ) {
                urls.add(u.toString());
              }
            } catch (e) {
              // skip malformed urls
            }
          }

          // Add discovered assets to cache (best-effort)
          for (const u of Array.from(urls)) {
            try {
              await cache.add(u);
              Logger.info('Pre-cached discovered asset', { url: u });
            } catch (e) {
              // ignore failures for optional assets
            }
          }
        }
      } catch (e) {
        Logger.warn('Failed to fetch/parse index.html for asset discovery', { error: e });
      }
    })(),
  );

  // Immediately activate the new service worker instead of waiting
  // Use ServiceWorkerGlobalScope-ish typing available in the worker
  const swSelf = self as unknown as ServiceWorkerGlobalScope & { skipWaiting?: () => void };
  if (typeof swSelf.skipWaiting === 'function') swSelf.skipWaiting();
});

// Fetch event - network-first for navigations, stale-while-revalidate for assets
self.addEventListener('fetch', (event: FetchEvent) => {
  const req = event.request;

  // Only handle GET same-origin requests
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Determine if this is a navigation/HTML request
  const accept = req.headers && req.headers.get && req.headers.get('accept');
  const isNavigation = req.mode === 'navigate' || (accept && accept.includes('text/html'));

  if (isNavigation) {
    // Network-first for navigations so the app shell updates to latest version.
    // Fallback to cached index.html when offline.
    event.respondWith(
      fetch(req)
        .then((networkResponse) => {
          try {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', copy));
          } catch (e) {
            // ignore cache write errors
          }
          return networkResponse;
        })
        .catch(() =>
          caches
            .match('/index.html')
            .then((cached) => cached || new Response('Offline', { status: 503 })),
        ),
    );
    return;
  }

  // Stale-while-revalidate for other GET assets: respond from cache if available,
  // and fetch in background to update the cache.
  event.respondWith(
    caches.match(req).then((cached) => {
      const networkFetch = fetch(req)
        .then((networkResponse) => {
          // Update cache asynchronously
          try {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          } catch (e) {
            // ignore
          }
          return networkResponse;
        })
        .catch(() => undefined);

      // If cached response exists, return it immediately and update cache in background
      if (cached) {
        // Kick off network update but don't wait for it
        networkFetch;
        return cached;
      }

      // No cache - await network
      return networkFetch.then((resp) => resp || new Response('Not found', { status: 404 }));
    }),
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            Logger.info('Deleting old cache', { cacheName });
            return caches.delete(cacheName);
          }
        }),
      );
    }),
  );
  // Claim clients immediately so the new SW controls pages without a navigation
  const swSelf2 = self as unknown as ServiceWorkerGlobalScope & {
    clients?: { claim?: () => Promise<void> };
  };
  if (swSelf2.clients && typeof swSelf2.clients.claim === 'function') swSelf2.clients.claim();
});

// Background sync for journal entries (when connectivity is restored)
self.addEventListener('sync', (event: unknown) => {
  const syncEvent = event as { tag?: string; waitUntil?: (promise: Promise<void>) => void };
  if (syncEvent.tag === 'background-sync-journal') {
    syncEvent.waitUntil?.(syncJournalEntries());
  }
});

async function syncJournalEntries() {
  // This would sync any pending journal entries when back online
  // Implementation would depend on your backend storage solution
  Logger.info('Syncing journal entries...');
}

// Simple message-based IndexedDB handling for client requests
import type { ISwMessage } from './models/index.ts';

self.addEventListener('message', (event: ExtendableMessageEvent) => {
  const mev = event as unknown as MessageEvent<ISwMessage>;
  const msg = mev.data || ({} as ISwMessage);
  if (!msg || !msg.type) return;

  // Log incoming messages for debugging in e2e traces
  try {
    Logger.debug('SW: received message', { type: msg.type });
  } catch (e) {
    // ignore logging failures
  }

  const respond = (payload: unknown) => {
    if (mev.ports && mev.ports[0]) {
      mev.ports[0].postMessage({ type: msg.type + ':response', payload });
      return;
    }
    const src = mev.source as unknown as
      | { postMessage?: (data: unknown, transfer?: Transferable[]) => void }
      | undefined;
    if (src && typeof src.postMessage === 'function') {
      src.postMessage({ type: msg.type + ':response', payload });
    }
  };

  // Current app IndexedDB stores: 'entries', 'dictionaries', 'settings'.
  // Support a compact set of message types used by the runtime.

  // Get a single journal entry by ISO date (payload: string date)
  if (msg.type === 'IDB:GetEntry') {
    const date = typeof msg.payload === 'string' ? msg.payload : undefined;
    if (!date) return respond({ success: false, error: 'missing date' });
    openDB()
      .then((db) => {
        const tx = db.transaction('entries', 'readonly');
        const os = tx.objectStore('entries');
        const req = os.get(date.slice(0, 10));
        return new Promise((res, rej) => {
          req.onsuccess = () => res(req.result || null);
          req.onerror = () => rej(req.error);
        });
      })
      .then((item) => respond({ success: true, item }))
      .catch((err) => respond({ success: false, error: String(err) }));
    return;
  }

  // Put (upsert) a journal entry (payload: IJournalEntry)
  if (msg.type === 'IDB:PutEntry') {
    const item =
      typeof msg.payload === 'object' && msg.payload
        ? (msg.payload as Record<string, unknown>)
        : undefined;
    if (!item) return respond({ success: false, error: 'missing entry' });
    openDB()
      .then((db) => {
        const tx = db.transaction('entries', 'readwrite');
        const os = tx.objectStore('entries');
        const r = os.put(item as unknown);
        return new Promise((res, rej) => {
          r.onsuccess = () => res(r.result);
          r.onerror = () => rej(r.error);
        });
      })
      .then(() => respond({ success: true }))
      .catch((err) => respond({ success: false, error: String(err) }));
    return;
  }

  // Delete entry by date (payload: string date)
  if (msg.type === 'IDB:DeleteEntry') {
    const date = typeof msg.payload === 'string' ? msg.payload : undefined;
    if (!date) return respond({ success: false, error: 'missing date' });
    openDB()
      .then((db) => {
        const tx = db.transaction('entries', 'readwrite');
        const os = tx.objectStore('entries');
        const r = os.delete(date.slice(0, 10));
        return new Promise((res, rej) => {
          r.onsuccess = () => res(true);
          r.onerror = () => rej(r.error);
        });
      })
      .then(() => respond({ success: true }))
      .catch((err) => respond({ success: false, error: String(err) }));
    return;
  }

  // List dates (keys) in entries
  if (msg.type === 'IDB:ListDates') {
    openDB()
      .then((db) => {
        const tx = db.transaction('entries', 'readonly');
        const os = tx.objectStore('entries');
        const r = os.getAllKeys();
        return new Promise((res, rej) => {
          r.onsuccess = () => res(r.result || []);
          r.onerror = () => rej(r.error);
        });
      })
      .then((keys) => respond({ success: true, keys }))
      .catch((err) => respond({ success: false, error: String(err) }));
    return;
  }

  // Query entries updated since timestamp (payload: { updatedAt: string, limit?: number })
  if (msg.type === 'IDB:SinceUpdated') {
    const payload = typeof msg.payload === 'object' && msg.payload ? (msg.payload as any) : {};
    const updatedAt = typeof payload.updatedAt === 'string' ? payload.updatedAt : undefined;
    const limit = typeof payload.limit === 'number' ? payload.limit : 100;
    if (!updatedAt) return respond({ success: false, error: 'missing updatedAt' });
    openDB()
      .then((db) => {
        const tx = db.transaction('entries', 'readonly');
        const os = tx.objectStore('entries');
        const idx = os.index ? os.index('byUpdatedAt') : null;
        if (!idx) return [] as unknown[];
        const range = IDBKeyRange.lowerBound(updatedAt);
        const req = idx.getAll(range, limit);
        return new Promise((res, rej) => {
          req.onsuccess = () => res(req.result || []);
          req.onerror = () => rej(req.error);
        });
      })
      .then((rows) => respond({ success: true, items: rows }))
      .catch((err) => respond({ success: false, error: String(err) }));
    return;
  }

  // By date range (payload: { startISO: string, endISO: string })
  if (msg.type === 'IDB:ByDateRange') {
    const payload = typeof msg.payload === 'object' && msg.payload ? (msg.payload as any) : {};
    const startISO = typeof payload.startISO === 'string' ? payload.startISO : undefined;
    const endISO = typeof payload.endISO === 'string' ? payload.endISO : undefined;
    if (!startISO || !endISO) return respond({ success: false, error: 'missing range' });
    openDB()
      .then((db) => {
        const tx = db.transaction('entries', 'readonly');
        const os = tx.objectStore('entries');
        const range = IDBKeyRange.bound(startISO.slice(0, 10), endISO.slice(0, 10));
        const result: unknown[] = [];
        return new Promise((res, rej) => {
          const req = os.openCursor(range);
          req.onsuccess = () => {
            const cursor = req.result;
            if (cursor) {
              result.push(cursor.value);
              cursor.continue();
            } else {
              res(result);
            }
          };
          req.onerror = () => rej(req.error);
        });
      })
      .then((items) => respond({ success: true, items }))
      .catch((err) => respond({ success: false, error: String(err) }));
    return;
  }

  // By tag (payload: string tag)
  if (msg.type === 'IDB:ByTag') {
    const tag = typeof msg.payload === 'string' ? msg.payload : undefined;
    if (!tag) return respond({ success: false, error: 'missing tag' });
    openDB()
      .then((db) => {
        const tx = db.transaction('entries', 'readonly');
        const os = tx.objectStore('entries');
        const idx = os.index ? os.index('byTag') : null;
        if (!idx) return [] as unknown[];
        const req = idx.getAll(tag);
        return new Promise((res, rej) => {
          req.onsuccess = () => res(req.result || []);
          req.onerror = () => rej(req.error);
        });
      })
      .then((rows) => respond({ success: true, items: rows }))
      .catch((err) => respond({ success: false, error: String(err) }));
    return;
  }

  // Dictionaries
  if (msg.type === 'IDB:GetDictionary') {
    const locale = typeof msg.payload === 'string' ? msg.payload : undefined;
    if (!locale) return respond({ success: false, error: 'missing locale' });
    openDB()
      .then((db) => {
        const tx = db.transaction('dictionaries', 'readonly');
        const os = tx.objectStore('dictionaries');
        const r = os.get(locale);
        return new Promise((res, rej) => {
          r.onsuccess = () => res(r.result || null);
          r.onerror = () => rej(r.error);
        });
      })
      .then((item) => respond({ success: true, item }))
      .catch((err) => respond({ success: false, error: String(err) }));
    return;
  }

  if (msg.type === 'IDB:PutDictionary') {
    const payload =
      typeof msg.payload === 'object' && msg.payload ? (msg.payload as any) : undefined;
    if (!payload || typeof payload.locale !== 'string' || !payload.resources)
      return respond({ success: false, error: 'invalid payload' });
    openDB()
      .then((db) => {
        const tx = db.transaction('dictionaries', 'readwrite');
        const os = tx.objectStore('dictionaries');
        const r = os.put({
          locale: payload.locale,
          resources: payload.resources,
          fetchedAt: new Date().toISOString(),
        });
        return new Promise((res, rej) => {
          r.onsuccess = () => res(r.result);
          r.onerror = () => rej(r.error);
        });
      })
      .then(() => respond({ success: true }))
      .catch((err) => respond({ success: false, error: String(err) }));
    return;
  }

  // Settings
  if (msg.type === 'IDB:GetSetting') {
    const key = typeof msg.payload === 'string' ? msg.payload : undefined;
    if (!key) return respond({ success: false, error: 'missing key' });
    openDB()
      .then((db) => {
        const tx = db.transaction('settings', 'readonly');
        const os = tx.objectStore('settings');
        const r = os.get(key);
        return new Promise((res, rej) => {
          r.onsuccess = () => res(r.result ? r.result.value : null);
          r.onerror = () => rej(r.error);
        });
      })
      .then((value) => respond({ success: true, value }))
      .catch((err) => respond({ success: false, error: String(err) }));
    return;
  }

  if (msg.type === 'IDB:PutSetting') {
    const payload =
      typeof msg.payload === 'object' && msg.payload ? (msg.payload as any) : undefined;
    if (!payload || typeof payload.key !== 'string')
      return respond({ success: false, error: 'invalid payload' });
    openDB()
      .then((db) => {
        const tx = db.transaction('settings', 'readwrite');
        const os = tx.objectStore('settings');
        const row = { key: payload.key, value: payload.value, updatedAt: new Date().toISOString() };
        const r = os.put(row);
        return new Promise((res, rej) => {
          r.onsuccess = () => res(r.result);
          r.onerror = () => rej(r.error);
        });
      })
      .then(() => respond({ success: true }))
      .catch((err) => respond({ success: false, error: String(err) }));
    return;
  }

  // Export all stores as a backup
  if (msg.type === 'IDB:ExportAll') {
    Logger.info('SW: handling IDB:ExportAll');
    openDB()
      .then((db) =>
        Promise.all(
          ['entries', 'dictionaries', 'settings'].map((s) =>
            readAllFromStore(db, s).then((items) => ({ store: s, items })),
          ),
        ),
      )
      .then((results) => {
        const payloadOut: Record<string, unknown[]> = {};
        for (const r of results) payloadOut[r.store] = r.items || [];
        respond({ success: true, items: payloadOut });
      })
      .catch((err) => respond({ success: false, error: String(err) }));
    return;
  }

  // Import all stores from payload { storeName: [items] }
  if (msg.type === 'IDB:ImportAll') {
    const payload = (msg.payload as Record<string, unknown[]>) || {};
    openDB()
      .then((db) =>
        Promise.all(
          Object.keys(payload).map((storeName) =>
            writeAllToStore(
              db,
              storeName,
              Array.isArray(payload[storeName])
                ? (payload[storeName] as Record<string, unknown>[])
                : [],
            ),
          ),
        ),
      )
      .then(() => respond({ success: true }))
      .catch((err) => respond({ success: false, error: String(err) }));
    return;
  }

  // Export all stores as a backup
  if (msg.type === 'IDB:ExportAll') {
    Logger.info('SW: handling IDB:ExportAll');
    openDB()
      .then((db) =>
        Promise.all(
          ['intentions', 'morning', 'midday', 'evening', 'weekly', 'monthly'].map((s) =>
            readAllFromStore(db, s).then((items) => ({ store: s, items })),
          ),
        ),
      )
      .then((results) => {
        const payload: Record<string, unknown[]> = {};
        for (const r of results) payload[r.store] = r.items || [];
        try {
          Logger.info('SW: ExportAll prepared payload', {
            stores: Object.keys(payload),
            sizes: Object.fromEntries(
              Object.keys(payload).map((k) => [k, (payload[k] || []).length]),
            ),
          });
        } catch (e) {
          /* ignore logging errors */
        }
        respond({ success: true, items: payload });
      })
      .catch((err) => {
        Logger.error('SW: ExportAll error', { error: String(err) });
        respond({ success: false, error: String(err) });
      });
    return;
  }

  // Import all stores from payload { storeName: [items] }
  if (msg.type === 'IDB:ImportAll') {
    const payload = (msg.payload as Record<string, unknown[]>) || {};
    openDB()
      .then((db) =>
        Promise.all(
          Object.keys(payload).map((storeName) =>
            writeAllToStore(
              db,
              storeName,
              Array.isArray(payload[storeName])
                ? (payload[storeName] as Record<string, unknown>[])
                : [],
            ),
          ),
        ),
      )
      .then(() => respond({ success: true }))
      .catch((err) => respond({ success: false, error: String(err) }));
    return;
  }
});

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const DB_NAME = 'journal-db';
    const DB_VERSION = 3;
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      // v1 -> entries store (keyPath: 'date') with indexes
      if (!db.objectStoreNames.contains('entries')) {
        const entries = db.createObjectStore('entries', { keyPath: 'date' });
        try {
          entries.createIndex('byUpdatedAt', 'updatedAt', { unique: false });
          entries.createIndex('byTag', 'tags', { unique: false, multiEntry: true });
        } catch (e) {
          // ignore index creation errors
        }
      }

      // dictionaries store keyed by locale
      if (!db.objectStoreNames.contains('dictionaries')) {
        const dict = db.createObjectStore('dictionaries', { keyPath: 'locale' });
        try {
          dict.createIndex('byFetchedAt', 'fetchedAt', { unique: false });
        } catch (e) {
          // ignore
        }
      }

      // settings store keyed by key
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function readAllFromStore(db: IDBDatabase, storeName: string): Promise<Record<string, unknown>[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

function writeAllToStore(
  db: IDBDatabase,
  storeName: string,
  items: Record<string, unknown>[],
): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const clearReq = store.clear();
    clearReq.onsuccess = () => {
      for (const it of items) {
        store.add(it as unknown);
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function getAllByDate(
  db: IDBDatabase,
  storeName: string,
  date: string,
): Promise<Record<string, unknown>[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const index = store.index ? store.index('date') : null;
    if (!index) {
      const req = store.getAll();
      req.onsuccess = () => {
        const all = req.result || [];
        resolve(
          (all as Record<string, unknown>[]).filter((it) => {
            const obj = it as Record<string, unknown>;
            const d = typeof obj.date === 'string' ? obj.date : undefined;
            const w = typeof obj.week_of === 'string' ? obj.week_of : undefined;
            return d === date || w === date;
          }),
        );
      };
      req.onerror = () => reject(req.error);
      return;
    }
    const range = IDBKeyRange.only(date);
    const req = index.getAll(range);
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

function addToStore(
  db: IDBDatabase,
  storeName: string,
  item: Record<string, unknown>,
): Promise<IDBValidKey | undefined> {
  return new Promise((resolve, reject) => {
    type ItemRecord = Record<string, unknown>;
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    // For time-keyed stores (daily/weekly/monthly checkins), prefer using the date as
    // the primary key so records are written/read by date instead of an auto-increment id.
    // This keeps existing schema (keyPath: 'id') but assigns the 'id' value to the
    // ISO date string when present, so add/put will create a stable key per date.
    try {
      // Normalize entries to ensure date key exists when storing in 'entries'
      if (storeName === 'entries') {
        const d =
          (typeof item.date === 'string' && item.date) ||
          (typeof item.entry_date === 'string' && item.entry_date) ||
          undefined;
        const finalDate = d || new Date().toISOString().slice(0, 10);
        const it = item as ItemRecord;
        it.date = finalDate;
      }
    } catch (e) {
      // ignore assignment errors and proceed to add
    }

    // Use put for time-keyed stores so saving an entry for the same date will
    // update (upsert) the existing record instead of failing on duplicate keys.
    // For other stores (like intentions) keep add() to preserve auto-increment behavior.
    let req: IDBRequest;
    try {
      // Use put() for our main stores to support upserts (entries,dictionaries,settings)
      if (['entries', 'dictionaries', 'settings'].includes(storeName)) {
        req = store.put(item as unknown);
      } else {
        req = store.add(item as unknown);
      }
    } catch (e) {
      reject(e);
      return;
    }
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
