import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const APP_URL = process.env.APP_URL || 'http://localhost:3000/#/settings';

test.describe('Settings export/import/clear flows', () => {
  test('export -> import -> clear DB -> clear cache', async ({ page, context }) => {
    await page.goto(APP_URL);

    // wait for settings component to render
    await page.waitForSelector('#export-db', { timeout: 5000 });

    // export database and capture download
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('#export-db'),
    ]);

    const suggestedFilename = download.suggestedFilename();
    const downloadsDir = path.join(process.cwd(), 'test-downloads');
    if (!fs.existsSync(downloadsDir)) fs.mkdirSync(downloadsDir);
    const filePath = path.join(downloadsDir, suggestedFilename || 'backup.json');
    await download.saveAs(filePath);

    // ensure file exists and has content
    const stat = fs.statSync(filePath);
    expect(stat.size).toBeGreaterThan(0);

    // import the same file
    const fileInput = await page.$('#import-file');
    expect(fileInput).not.toBeNull();
    await fileInput?.setInputFiles(filePath);

    // click import button
    await page.click('#import-db');

    // wait for a message element (app shows messages in #settings-message)
    const message = await page.locator('#settings-message');
    // SettingsComponent shows 'Import completed' on success
    await expect(message).toHaveText(/import completed/i, { timeout: 7000 });

    // accept the confirmation dialog that appears when clearing DB
    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });

    // clear the database and assert the exact success message
    await page.click('#clear-db');
    await expect(message).toHaveText(/all data cleared|failed to clear data/i, { timeout: 7000 });

    // clear caches and assert message
    await page.click('#clear-cache');
    await expect(message).toHaveText(/cache cleared|failed to clear cache/i, { timeout: 7000 });
  });
});
