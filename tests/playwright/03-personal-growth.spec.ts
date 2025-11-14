import { test } from '@playwright/test';

const APP_URL = process.env.APP_URL || 'http://localhost:3000/';

test('personal growth view opens', async ({ page }) => {
  await page.goto(APP_URL + '#/growth');
  await page.waitForSelector('personal-growth', { timeout: 5000 });
});
