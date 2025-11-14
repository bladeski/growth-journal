import { test, expect } from '@playwright/test';

const APP_URL = process.env.APP_URL || 'http://localhost:3000/';

test('open weekly review', async ({ page }) => {
  await page.goto(APP_URL + '#/weekly');
  await page.waitForSelector('weekly-review', { timeout: 5000 });
});

test('open monthly reflection', async ({ page }) => {
  await page.goto(APP_URL + '#/monthly');
  await page.waitForSelector('monthly-reflection', { timeout: 5000 });
});
