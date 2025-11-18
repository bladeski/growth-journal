import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const APP_URL = process.env.APP_URL || 'http://localhost:3000/#/settings';

test('settings export/import/clear flows', async ({ page }) => {
  await page.goto(APP_URL);
  await page.waitForLoadState('networkidle');
  // Wait for the settings content (or the export button) to be available
  await page.waitForSelector('#export-db', { timeout: 30000 });
  const exportBtn = page.locator('#export-db');
  await exportBtn.waitFor({ state: 'visible', timeout: 30000 });
  await expect(exportBtn).toBeVisible({ timeout: 30000 });

  const downloadsDir = path.join(process.cwd(), 'downloads');
  if (!fs.existsSync(downloadsDir)) fs.mkdirSync(downloadsDir);

  const [download] = await Promise.all([page.waitForEvent('download'), page.click('#export-db')]);
  const filename = download.suggestedFilename() || 'backup.json';
  const saved = path.join(downloadsDir, filename);
  await download.saveAs(saved);

  const fileInput = await page.$('#import-file');
  if (!fileInput) throw new Error('import-file input missing');
  await fileInput.setInputFiles(saved);
  await page.click('#import-db');

  const message = await page.locator('#settings-message');
  await expect(message).toHaveText(/import completed/i, { timeout: 15000 });

  page.on('dialog', async (d) => d.accept());
  await page.click('#clear-db');
  await expect(message).toHaveText(/all data cleared|failed to clear data/i, { timeout: 15000 });

  await page.click('#clear-cache');
  await expect(message).toHaveText(/cache cleared|failed to clear cache/i, { timeout: 15000 });

  try {
    fs.rmSync(downloadsDir, { recursive: true, force: true });
  } catch {
    // ignore
  }
});
