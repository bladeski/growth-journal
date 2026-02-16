import { IJournalEntry } from '../models/index.ts';
import { Resources } from '../i18n/i18n.ts';
import { openDB, tx, store, reqToPromise, index } from './idb-helpers.ts';

const DB_NAME = 'journal-db';
const DB_VERSION = 3;

const STORES = {
  entries: 'entries',
  dictionaries: 'dictionaries',
  settings: 'settings',
} as const;

type DictionaryRow = {
  locale: string;
  resources: Resources;
  fetchedAt: string;
};

export class JournalDB {
  private _db!: IDBDatabase;

  async init(): Promise<void> {
    this._db = await openDB(DB_NAME, DB_VERSION, (db, oldVersion) => {
      // v1 -> create stores
      if (oldVersion < 1) {
        const entries = db.createObjectStore(STORES.entries, { keyPath: 'date' });
        entries.createIndex('byUpdatedAt', 'updatedAt', { unique: false });
        entries.createIndex('byTag', 'tags', { unique: false, multiEntry: true });
      }

      // v2 -> dictionaries cache (downloaded i18n resources)
      if (oldVersion < 2) {
        if (!db.objectStoreNames.contains(STORES.dictionaries)) {
          const dict = db.createObjectStore(STORES.dictionaries, { keyPath: 'locale' });
          dict.createIndex('byFetchedAt', 'fetchedAt', { unique: false });
        }
      }

      // v3 -> settings store
      if (oldVersion < 3) {
        if (!db.objectStoreNames.contains(STORES.settings)) {
          db.createObjectStore(STORES.settings, { keyPath: 'key' });
        }
      }
      // future:
      // if (oldVersion < 2) { ... }
    });

    // Optional: request persistent storage
    if ('storage' in navigator && 'persist' in navigator.storage) {
      try {
        await navigator.storage.persist();
      } catch {
        // TODO: log failure?
      }
    }
  }

  // ---------- Dictionaries ----------

  async getDictionary(locale: string): Promise<Resources | null> {
    const t = tx(this._db, STORES.dictionaries, 'readonly');
    const os = store<DictionaryRow>(t, STORES.dictionaries);
    const row = await reqToPromise<DictionaryRow | undefined>(os.get(locale));
    await txDone(t);
    return row?.resources ?? null;
  }

  async putDictionary(locale: string, resources: Resources): Promise<void> {
    const t = tx(this._db, STORES.dictionaries, 'readwrite');
    const os = store<DictionaryRow>(t, STORES.dictionaries);
    const row: DictionaryRow = { locale, resources, fetchedAt: new Date().toISOString() };
    await reqToPromise(os.put(row));
    await txDone(t);
  }

  // ---------- CRUD ----------

  async getEntry(dateISO: string): Promise<IJournalEntry | null> {
    const t = tx(this._db, STORES.entries, 'readonly');
    const os = store<IJournalEntry>(t, STORES.entries);
    const res = await reqToPromise<IJournalEntry | undefined>(os.get(dateISO.slice(0, 10)));
    return res ?? null;
  }

  async putEntry(entry: IJournalEntry): Promise<void> {
    const t = tx(this._db, STORES.entries, 'readwrite');
    const os = store<IJournalEntry>(t, STORES.entries);
    await reqToPromise(os.put(entry));
    await txDone(t);
  }

  async deleteEntry(dateISO: string): Promise<void> {
    const t = tx(this._db, STORES.entries, 'readwrite');
    const os = store<IJournalEntry>(t, STORES.entries);
    await reqToPromise(os.delete(dateISO.slice(0, 10)));
    await txDone(t);
  }

  // List all dates available (keys)
  async listDates(): Promise<string[]> {
    const t = tx(this._db, STORES.entries, 'readonly');
    const os = store<IJournalEntry>(t, STORES.entries);

    // getAllKeys is widely supported in modern browsers
    const keys = await reqToPromise<IDBValidKey[]>(os.getAllKeys());
    await txDone(t);
    return keys.map((k) => String(k));
  }

  // ---------- Queries ----------

  /**
   * Return entries updated since an ISO timestamp (for sync or "recently edited").
   */
  async sinceUpdated(updatedAtISO: string, limit = 100): Promise<IJournalEntry[]> {
    const t = tx(this._db, STORES.entries, 'readonly');
    const os = store<IJournalEntry>(t, STORES.entries);
    const idx = index(os, 'byUpdatedAt');
    const range = IDBKeyRange.lowerBound(updatedAtISO);
    const req = idx.getAll(range, limit);
    const rows = await reqToPromise<IJournalEntry[]>(req);
    await txDone(t);
    return rows.sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
  }

  /**
   * Get entries whose date is between [startISO, endISO] inclusive.
   * Useful to render a week/month view.
   */
  async byDateRange(startISO: string, endISO: string): Promise<IJournalEntry[]> {
    const t = tx(this._db, STORES.entries, 'readonly');
    const os = store<IJournalEntry>(t, STORES.entries);
    const keyRange = IDBKeyRange.bound(startISO.slice(0, 10), endISO.slice(0, 10));
    const result: IJournalEntry[] = [];
    await iterateByKey(os, keyRange, (val) => result.push(val as IJournalEntry));
    await txDone(t);
    // Sort by date ascending
    return result.sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Filter by tag (multiEntry index).
   */
  async byTag(tag: string, limit = 200): Promise<IJournalEntry[]> {
    const t = tx(this._db, STORES.entries, 'readonly');
    const os = store<IJournalEntry>(t, STORES.entries);
    const idx = index(os, 'byTag');
    const req = idx.getAll(tag, limit);
    const rows = await reqToPromise<IJournalEntry[]>(req);
    await txDone(t);
    return rows;
  }

  async getSetting(key: string): Promise<unknown | null> {
    const t = tx(this._db, STORES.settings, 'readonly');
    const os = store<SettingRow>(t, STORES.settings);
    const row = await reqToPromise<SettingRow | undefined>(os.get(key));
    await txDone(t);
    return row ? row.value : null;
  }

  async putSetting(key: string, value: unknown): Promise<void> {
    const t = tx(this._db, STORES.settings, 'readwrite');
    const os = store<SettingRow>(t, STORES.settings);
    const row: SettingRow = { key, value, updatedAt: new Date().toISOString() };
    await reqToPromise(os.put(row));
    await txDone(t);
  }
}

// Tell TypeScript these prototype helpers exist (we assign them below)
interface JournalDB {
  getSetting(key: string): Promise<unknown | null>;
  putSetting(key: string, value: unknown): Promise<void>;
}

// ---------- Settings ----------

type SettingRow = { key: string; value: unknown; updatedAt: string };

export interface SettingsStore {
  getSetting(key: string): Promise<unknown | null>;
  putSetting(key: string, value: unknown): Promise<void>;
}

// Settings helpers on JournalDB
export interface JournalDBWithSettings extends JournalDB, SettingsStore { }

// ---------- helpers ----------

// Await transaction completion (Chrome resolves on last request put/delete; this is safer)
function txDone(t: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

function iterateByKey(
  os: IDBObjectStore,
  range: IDBKeyRange | undefined,
  onValue: (value: unknown) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = os.openCursor(range);
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        onValue(cursor.value);
        cursor.continue();
      } else {
        resolve();
      }
    };
    req.onerror = () => reject(req.error);
  });
}
