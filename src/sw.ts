// Lightweight local logger for the service worker.
// Avoid importing the app's LoggingService here to keep the worker bundle
// self-contained and prevent module resolution issues when the worker is
// registered directly from `dev-dist`.
const Logger = {
  info: (...args: unknown[]) => {
    try {
      // eslint-disable-next-line no-console
      console.info('[SW]', ...args);
    } catch (_) {
      /* empty */
    }
  },
  debug: (...args: unknown[]) => {
    try {
      // eslint-disable-next-line no-console
      console.debug('[SW]', ...args);
    } catch (_) {
      // Ignore console errors
    }
  },
  warn: (...args: unknown[]) => {
    try {
      // eslint-disable-next-line no-console
      console.warn('[SW]', ...args);
    } catch (_) {
      /* empty */
    }
  },
  error: (...args: unknown[]) => {
    try {
      // eslint-disable-next-line no-console
      console.error('[SW]', ...args);
    } catch (_) {
      /* empty */
    }
  },
};

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
  if ((event as SyncEvent).tag === 'background-sync-journal') {
    (event as SyncEvent).waitUntil(syncJournalEntries());
  }
});

async function syncJournalEntries() {
  // This would sync any pending journal entries when back online
  // Implementation would depend on your backend storage solution
  Logger.info('Syncing journal entries...');
}

// Simple message-based IndexedDB handling for client requests
import type { ISwMessage } from './interfaces/index.ts';

self.addEventListener('message', (event: MessageEvent<ISwMessage>) => {
  const msg = event.data || ({} as ISwMessage);
  if (!msg || !msg.type) return;

  // Log incoming messages for debugging in e2e traces
  try {
    Logger.debug('SW: received message', { type: msg.type });
  } catch (e) {
    // ignore logging failures
  }

  const respond = (payload: unknown) => {
    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage({ type: msg.type + ':response', payload });
      return;
    }
    const src = event.source as unknown as
      | { postMessage?: (data: unknown, transfer?: Transferable[]) => void }
      | undefined;
    if (src && typeof src.postMessage === 'function') {
      src.postMessage({ type: msg.type + ':response', payload });
    }
  };

  // map message types to store names and operations
  const mapGetAll: Record<string, string> = {
    'IDB:GetGrowthIntentions': 'intentions',
  };

  const mapSetAll: Record<string, string> = {
    'IDB:SetGrowthIntentions': 'intentions',
  };

  const mapAdd: Record<string, string> = {
    'IDB:AddGrowthIntention': 'intentions',
    'IDB:AddMorningCheckin': 'morning',
    'IDB:AddMiddayCheckin': 'midday',
    'IDB:AddEveningReflection': 'evening',
    'IDB:AddWeeklyReview': 'weekly',
    'IDB:AddMonthlyReview': 'monthly',
  };

  const mapGetByDate: Record<string, string> = {
    'IDB:GetGrowthIntention': 'intentions',
    'IDB:GetMorningIntention': 'morning',
    'IDB:GetMorningCheckin': 'morning',
    'IDB:GetMiddayCheckin': 'midday',
    'IDB:GetEveningReflection': 'evening',
    'IDB:GetWeeklyReview': 'weekly',
    'IDB:GetMonthlyReview': 'monthly',
  };

  // Handle getAll
  if (mapGetAll[msg.type]) {
    const store = mapGetAll[msg.type];
    openDB()
      .then((db) => readAllFromStore(db, store))
      .then((items) => respond({ success: true, items }))
      .catch((err) => respond({ success: false, error: String(err) }));
    return;
  }

  // Handle setAll
  if (mapSetAll[msg.type]) {
    const store = mapSetAll[msg.type];
    openDB()
      .then((db) => {
        const payload = Array.isArray(msg.payload)
          ? (msg.payload as Record<string, unknown>[])
          : [];
        return writeAllToStore(db, store, payload);
      })
      .then(() => respond({ success: true }))
      .catch((err) => respond({ success: false, error: String(err) }));
    return;
  }

  // Handle add single item
  if (mapAdd[msg.type]) {
    const store = mapAdd[msg.type];
    const item =
      typeof msg.payload === 'object' && msg.payload
        ? (msg.payload as Record<string, unknown>)
        : {};
    Logger.debug('SW: add request', { type: msg.type, store, item });
    openDB()
      .then((db) => addToStore(db, store, item))
      .then((key) => {
        Logger.debug('SW: addToStore result', { store, key });
        respond({ success: true });
      })
      .catch((err) => {
        Logger.error('SW: addToStore error', { error: err });
        respond({ success: false, error: String(err) });
      });
    return;
  }

  // Handle get by date
  if (mapGetByDate[msg.type]) {
    const store = mapGetByDate[msg.type];
    const date = typeof msg.payload === 'string' ? msg.payload : undefined;
    openDB()
      .then((db) => (date ? getAllByDate(db, store, date) : Promise.resolve([])))
      .then((items) => respond({ success: true, items }))
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
    const req = indexedDB.open('growth-journal-db', 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      const stores = ['intentions', 'morning', 'midday', 'evening', 'weekly', 'monthly'];
      for (const s of stores) {
        if (!db.objectStoreNames.contains(s)) {
          const os = db.createObjectStore(s, { keyPath: 'id', autoIncrement: true });
          try {
            os.createIndex('date', 'date', { unique: false });
          } catch (e) {
            // ignore if index exists
          }
        }
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
      const timeStores = new Set(['morning', 'midday', 'evening', 'weekly', 'monthly']);
      // prefer canonical 'date', but fall back to 'check_date' or 'entry_date' used elsewhere
      const d =
        (typeof item.date === 'string' && item.date) ||
        (typeof item.check_date === 'string' && item.check_date) ||
        (typeof item.entry_date === 'string' && item.entry_date) ||
        undefined;
      if (timeStores.has(storeName)) {
        // If no date provided, default to today's ISO date so today's checkins are keyed by date
        const finalDate = d || new Date().toISOString().slice(0, 10);
        if (finalDate) {
          // ensure the id uses the date string so subsequent lookups keyed by date are stable
          // also ensure the canonical 'date' field exists for index lookups
          const it = item as ItemRecord;
          it.id = finalDate;
          // populate the date field if missing
          if (!it.date) it.date = finalDate;
        }
      }
    } catch (e) {
      // ignore assignment errors and proceed to add
    }

    // Use put for time-keyed stores so saving an entry for the same date will
    // update (upsert) the existing record instead of failing on duplicate keys.
    // For other stores (like intentions) keep add() to preserve auto-increment behavior.
    let req: IDBRequest;
    try {
      const timeStores = new Set(['morning', 'midday', 'evening', 'weekly', 'monthly']);
      if (timeStores.has(storeName)) {
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
