import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const APP_URL = process.env.APP_URL || 'http://localhost:3000/#/settings';

test('settings export/import/clear flows', async ({ page }) => {
  await page.goto(APP_URL);
  await page.waitForLoadState('networkidle');
  await expect(page.locator('#export-db')).toBeVisible({ timeout: 15000 });

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
  await expect(message).toHaveText(/import completed/i, { timeout: 7000 });

  page.on('dialog', async (d) => d.accept());
  await page.click('#clear-db');
  await expect(message).toHaveText(/all data cleared|failed to clear data/i, { timeout: 7000 });

  await page.click('#clear-cache');
  await expect(message).toHaveText(/cache cleared|failed to clear cache/i, { timeout: 7000 });

  try {
    fs.rmSync(downloadsDir, { recursive: true, force: true });
  } catch {
    // ignore
  }
});
