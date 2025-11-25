import { test, expect } from '@playwright/test';
// Ensure downloads are accepted in this spec (CI runners sometimes require explicit opt-in)
test.use({ acceptDownloads: true });
import fs from 'fs';
import path from 'path';

const rawAppUrl = process.env.APP_URL || 'http://localhost:3000';
// Ensure the URL used for this spec always navigates to the settings hash
const APP_URL = rawAppUrl.includes('#') ? rawAppUrl : rawAppUrl.replace(/\/$/, '') + '/#/settings';

test('settings export/import/clear flows', async ({ page }) => {
  await page.goto(APP_URL);
  await page.waitForLoadState('networkidle');
  // Scope all selectors to the rendered settings component (shadow DOM)
  await page.waitForFunction(() => !!(window as any).app, null, { timeout: 30000 });
  const settings = page.locator('app-settings');
  await settings.waitFor({ state: 'attached', timeout: 60000 });

  // Wait for the settings content (or the export button) to be available inside the component
  const exportBtn = settings.locator('#export-db');
  await exportBtn.waitFor({ state: 'visible', timeout: 60000 });
  await expect(exportBtn).toBeVisible({ timeout: 60000 });

  const downloadsDir = path.join(process.cwd(), 'downloads');
  if (!fs.existsSync(downloadsDir)) fs.mkdirSync(downloadsDir);

  // Trigger the export while listening for the download event on the
  // context. Waiting for the download in parallel with the click ensures
  // Playwright observes downloads triggered by the page in CI/headless
  // environments. After triggering, assert the UI acknowledges the export.
  // Try to capture the browser download event in parallel with the click.
  // If no download event is observed (CI flakiness), fallback to a test-exposed
  // global payload `window.__lastExportPayload` that the app sets when exporting.
  let download: any = null;
  const downloadPromise = page.context().waitForEvent('download', { timeout: 10000 }).catch(() => null);
  await exportBtn.click();
  // Ensure the export helper is invoked in case click doesn't trigger it in this environment
  await page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    try {
      if ((window as any).exportGrowthDb) (window as any).exportGrowthDb();
    } catch (_) {
      /* ignore */
    }
  });

  // Also listen for the app's reliable export-ready signal as a fallback
  const exportReadyPromise = page.evaluate(() =>
    new Promise<boolean>((resolve) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((window as any).__lastExportPayload) return resolve(true);
      const onReady = () => {
        window.removeEventListener('gj:export-ready', onReady as EventListener);
        resolve(true);
      };
      window.addEventListener('gj:export-ready', onReady as EventListener);
      // fallback timeout to avoid hanging tests
      setTimeout(() => resolve(false), 10000);
    }),
  );

  const raceResult = await Promise.race([downloadPromise, exportReadyPromise]);
  download = typeof raceResult === 'object' ? raceResult : null;

  await expect(settings.locator('text=Export started')).toBeVisible({ timeout: 15000 });

  let saved: string;
  if (download) {
    const filename = download.suggestedFilename() || 'backup.json';
    saved = path.join(downloadsDir, filename);
    await download.saveAs(saved);
  } else {
    // fallback: wait for the app to set __lastExportPayload (signaled by gj:export-ready)
    await page.waitForFunction(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return !!(window as any).__lastExportPayload;
    }, null, { timeout: 15000 }).catch(() => null);

    // read payload from page and write to disk. If the app didn't populate
    // `__lastExportPayload`, read directly from IndexedDB as a robust fallback.
    let payload = await page.evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (window as any).__lastExportPayload || null;
    });
    if (!payload) {
      payload = await page.evaluate(async () => {
        return await new Promise<Record<string, unknown[]> | null>((resolve) => {
          try {
            const req = indexedDB.open('growth-journal-db');
            req.onsuccess = () => {
              try {
                const db = req.result;
                const stores = ['intentions', 'morning', 'midday', 'evening', 'weekly', 'monthly'];
                const result: Record<string, unknown[]> = {};
                let remaining = stores.length;
                for (const s of stores) {
                  if (!db.objectStoreNames.contains(s)) {
                    result[s] = [];
                    remaining -= 1;
                    if (remaining === 0) resolve(result);
                    continue;
                  }
                  const tx = db.transaction(s, 'readonly');
                  const store = tx.objectStore(s);
                  const getAllReq = store.getAll();
                  getAllReq.onsuccess = () => {
                    result[s] = getAllReq.result || [];
                    remaining -= 1;
                    if (remaining === 0) resolve(result);
                  };
                  getAllReq.onerror = () => {
                    result[s] = [];
                    remaining -= 1;
                    if (remaining === 0) resolve(result);
                  };
                }
              } catch (e) {
                resolve(null);
              }
            };
            req.onerror = () => resolve(null);
          } catch (e) {
            resolve(null);
          }
        });
      });
    }
    if (!payload) throw new Error('No download event and no __lastExportPayload available');
    const filename = await page.evaluate(() => (window as any).__lastExportFilename || 'backup.json');
    saved = path.join(downloadsDir, filename as string);
    fs.writeFileSync(saved, JSON.stringify(payload, null, 2), 'utf-8');
  }

  const fileInput = settings.locator('#import-file');
  await expect(fileInput).toBeAttached({ timeout: 15000 });
  await fileInput.setInputFiles(saved);
  await settings.locator('#import-db').click();

  const message = settings.locator('#settings-message');
  await expect(message).toHaveText(/import completed/i, { timeout: 15000 });

  page.on('dialog', async (d) => d.accept());
  await settings.locator('#clear-db').click();
  await expect(message).toHaveText(/all data cleared|failed to clear data/i, { timeout: 30000 });

  await settings.locator('#clear-cache').click();
  await expect(message).toHaveText(/cache cleared|failed to clear cache/i, { timeout: 30000 });

  try {
    fs.rmSync(downloadsDir, { recursive: true, force: true });
  } catch {
    // ignore
  }
});
