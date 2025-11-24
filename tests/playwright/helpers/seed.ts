import { Page } from '@playwright/test';

const DEFAULT_DB = 'growth-journal-db';

export async function clearIndexedDb(page: Page, dbName = DEFAULT_DB) {
  // Ensure the page is at the app origin before manipulating IndexedDB
  await page.evaluate(async (name) => {
    return new Promise<void>((resolve) => {
      try {
        const req = indexedDB.deleteDatabase(name);
        const finish = () => resolve();
        req.onsuccess = finish;
        req.onerror = finish;
        req.onblocked = finish;
        setTimeout(finish, 2000);
      } catch (e) {
        resolve();
      }
    });
  }, dbName);
}

/**
 * Create a deterministic, empty DB with the stores the app expects.
 * This produces a consistent starting state for E2E tests.
 */
export async function seedEmptyDb(page: Page, dbName = DEFAULT_DB) {
  const spec = {
    version: 1,
    stores: {
      'growth-intentions': { keyPath: 'id', autoIncrement: false, entries: [] },
      'morning-checkins': { keyPath: 'id', autoIncrement: true, entries: [] },
      'midday-checkins': { keyPath: 'id', autoIncrement: true, entries: [] },
      'evening-checkins': { keyPath: 'id', autoIncrement: true, entries: [] },
      'weekly-reviews': { keyPath: 'id', autoIncrement: true, entries: [] },
      'monthly-reflections': { keyPath: 'id', autoIncrement: true, entries: [] },
    },
  };

  await page.evaluate(async ({ name, cfg }) => {
    await new Promise<void>((resolve) => {
      try {
        const req = indexedDB.open(name, cfg.version || 1);
        req.onupgradeneeded = () => {
          const db = req.result as IDBDatabase;
          try {
            for (const sName of Object.keys(cfg.stores || {})) {
              const sCfg = cfg.stores[sName] || {};
              if (!db.objectStoreNames.contains(sName)) {
                db.createObjectStore(sName, { keyPath: sCfg.keyPath || 'id', autoIncrement: !!sCfg.autoIncrement });
              }
            }
          } catch (e) {
            // ignore
          }
        };
        req.onsuccess = () => {
          try {
            const db = req.result as IDBDatabase;
            const stores = Object.keys(cfg.stores || {});
            if (stores.length) {
              const tx = db.transaction(stores, 'readwrite');
              for (const sName of stores) {
                const entries = (cfg.stores[sName] && cfg.stores[sName].entries) || [];
                const store = tx.objectStore(sName);
                for (const e of entries) store.put(e);
              }
              tx.oncomplete = () => {
                db.close();
                resolve();
              };
              tx.onerror = () => {
                try { db.close(); } catch {}
                resolve();
              };
            } else {
              db.close();
              resolve();
            }
          } catch (e) {
            resolve();
          }
        };
        req.onerror = () => resolve();
        setTimeout(() => resolve(), 5000);
      } catch (e) {
        resolve();
      }
    });
  }, { name: dbName, cfg: spec });
}

/**
 * Convenience: clear then seed empty DB. Tests should `await page.goto(APP_URL)` before calling.
 */
export async function clearAndSeedEmpty(page: Page, dbName = DEFAULT_DB) {
  await clearIndexedDb(page, dbName);
  await seedEmptyDb(page, dbName);
}

/** Seed the DB with a few sample entries used by content assertions */
export async function seedWithSampleData(page: Page, dbName = DEFAULT_DB) {
  const sample = {
    growthIntentions: [
      {
        id: 'sample-g1',
        date: new Date().toISOString().slice(0, 10),
        morning_intention: 'Sample seeded intention',
        core_value: 'Kindness',
      },
    ],
    morningCheckins: [
      {
        id: 'm1',
        date: new Date().toISOString().slice(0, 10),
        practice_intention: 'Sample seeded intention',
        core_value: 'Kindness',
        check_date: new Date().toISOString(),
      },
    ],
    middayCheckins: [
      {
        id: 'md1',
        date: new Date().toISOString().slice(0, 10),
        midday_question: 'Midday checkin sample note',
        core_value: 'Kindness',
        check_date: new Date().toISOString(),
      },
    ],
    eveningCheckins: [
      {
        id: 'e1',
        date: new Date().toISOString().slice(0, 10),
        what_went_well: 'Evening: celebrated a small win',
        small_win: 'Completed focused practice',
        summary: 'Evening summary sample',
        check_date: new Date().toISOString(),
      },
    ],
    weeklyReviews: [
      {
        id: 'w1',
        week: new Date().toISOString().slice(0, 10),
        summary: 'Weekly review sample',
      },
    ],
    monthlyReflections: [
      {
        id: 'mo1',
        month: new Date().toISOString().slice(0, 7),
        overview: 'Monthly reflection sample',
      },
    ],
  };

  await page.evaluate(async ({ name, sample }) => {
    try {
      const req = indexedDB.open(name);
      req.onupgradeneeded = () => {
        const db = req.result as IDBDatabase;
        if (!db.objectStoreNames.contains('growth-intentions')) db.createObjectStore('growth-intentions', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('morning-checkins')) db.createObjectStore('morning-checkins', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('midday-checkins')) db.createObjectStore('midday-checkins', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('evening-checkins')) db.createObjectStore('evening-checkins', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('weekly-reviews')) db.createObjectStore('weekly-reviews', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('monthly-reflections')) db.createObjectStore('monthly-reflections', { keyPath: 'id' });
      };
      req.onsuccess = () => {
        const db = req.result as IDBDatabase;
        const stores = ['growth-intentions', 'morning-checkins', 'midday-checkins', 'evening-checkins', 'weekly-reviews', 'monthly-reflections'];
        const tx = db.transaction(stores, 'readwrite');
        const gi = tx.objectStore('growth-intentions');
        for (const g of sample.growthIntentions || []) gi.put(g);
        const mc = tx.objectStore('morning-checkins');
        for (const m of sample.morningCheckins || []) mc.put(m);
        const md = tx.objectStore('midday-checkins');
        for (const mm of sample.middayCheckins || []) md.put(mm);
        const ev = tx.objectStore('evening-checkins');
        for (const ee of sample.eveningCheckins || []) ev.put(ee);
        const wr = tx.objectStore('weekly-reviews');
        for (const w of sample.weeklyReviews || []) wr.put(w);
        const mr = tx.objectStore('monthly-reflections');
        for (const mo of sample.monthlyReflections || []) mr.put(mo);
        tx.oncomplete = () => db.close();
        tx.onerror = () => db.close();
      };
      req.onerror = () => {};
    } catch (e) {
      // ignore
    }
  }, { name: dbName, sample });
}

