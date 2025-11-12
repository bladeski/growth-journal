const CACHE_NAME = 'growth-journal-v1';
const urlsToCache = ['/', '/index.html', '/index.js', '/styles/styles.css', '/manifest.json'];

// Install event - cache resources
self.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Opened cache');
      return cache.addAll(urlsToCache);
    }),
  );
  // Immediately activate the new service worker instead of waiting
  // Use a safe any-cast to access optional runtime-only APIs without ts-ignore
  const swSelf: any = self;
  if (typeof swSelf.skipWaiting === 'function') swSelf.skipWaiting();
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', (event: FetchEvent) => {
  const req = event.request;

  // Determine if this is a navigation/HTML request
  const accept = req.headers && req.headers.get && req.headers.get('accept');
  const isNavigation = req.mode === 'navigate' || (accept && accept.includes('text/html'));

  if (isNavigation) {
    // Network-first for navigations so the app shell updates to latest version
    event.respondWith(
      fetch(req)
        .then((networkResponse) => {
          try {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          } catch (e) {
            // ignore cache write errors
          }
          return networkResponse;
        })
        .catch(() =>
          caches
            .match('/index.html')
            .then(
              (cached) =>
                cached ||
                caches
                  .match(req)
                  .then((response) => response || new Response('Not found', { status: 404 })),
            ),
        ),
    );
    return;
  }

  // Cache-first for other requests (assets)
  event.respondWith(caches.match(req).then((response) => response || fetch(req)));
});

// Activate event - clean up old caches
self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        }),
      );
    }),
  );
  // Claim clients immediately so the new SW controls pages without a navigation
  const swSelf2: any = self;
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
  console.log('Syncing journal entries...');
}

// Simple message-based IndexedDB handling for client requests
interface SwMessage {
  type: string;
  payload?: unknown;
}

self.addEventListener('message', (event: MessageEvent<SwMessage>) => {
  const msg = event.data || ({} as SwMessage);
  if (!msg || !msg.type) return;

  const respond = (payload: unknown) => {
    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage({ type: msg.type + ':response', payload });
    } else if (event.source && 'postMessage' in event.source) {
      (event.source as { postMessage?: (data: unknown) => void }).postMessage?.({
        type: msg.type + ':response',
        payload,
      });
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
    openDB()
      .then((db) => addToStore(db, store, item))
      .then(() => respond({ success: true }))
      .catch((err) => respond({ success: false, error: String(err) }));
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
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.add(item as unknown);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
