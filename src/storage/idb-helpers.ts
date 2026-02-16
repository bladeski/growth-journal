// /src/storage/idb-helpers.ts
export type IDBMode = 'readonly' | 'readwrite';

export function openDB(
  name: string,
  version: number,
  upgrade: (
    db: IDBDatabase,
    oldVersion: number,
    newVersion: number | null,
    tx: IDBTransaction,
  ) => void,
): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(name, version);
    req.onupgradeneeded = (event) => {
      const db = req.result;
      const tx = req.transaction!;
      upgrade(db, event.oldVersion, req.result.version, tx);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => console.warn('[idb] open blocked (close other tabs?)');
  });
}

export function tx(db: IDBDatabase, store: string, mode: IDBMode): IDBTransaction {
  return db.transaction(store, mode);
}

export function store<T = unknown>(tx: IDBTransaction, name: string): IDBObjectStore {
  return tx.objectStore(name);
}

export function reqToPromise<T = unknown>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result as T);
    req.onerror = () => reject(req.error);
  });
}

export function index(os: IDBObjectStore, idx: string): IDBIndex {
  return os.index(idx);
}
