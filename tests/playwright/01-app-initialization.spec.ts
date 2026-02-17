import { test, expect } from '@playwright/test';

const APP_URL = process.env.APP_URL || 'http://localhost:3000/';

test.describe('App Initialization', () => {
  test('should load and initialize the journal app', async ({ page }) => {
    await page.goto(APP_URL);
    await page.waitForLoadState('networkidle');
    
    // Wait for custom elements to be registered
    await page.waitForFunction(
      () => !!(window as any).customElements?.get?.('journal-app'),
      null,
      { timeout: 10000 }
    );
    
    // Verify journal-app is rendered
    const journalApp = page.locator('journal-app');
    await expect(journalApp).toBeVisible({ timeout: 10000 });
  });

  test('should display the main heading', async ({ page }) => {
    await page.goto(APP_URL);
    await page.waitForSelector('journal-app', { timeout: 10000 });
    
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
    await expect(heading).toHaveText(/Growth Journal/i);
  });

  test('should render journal-day component', async ({ page }) => {
    await page.goto(APP_URL);
    await page.waitForFunction(
      () => !!(window as any).customElements?.get?.('journal-day'),
      null,
      { timeout: 10000 }
    );
    
    const journalDay = page.locator('journal-day');
    await expect(journalDay).toBeVisible({ timeout: 10000 });
  });

  test('should display date navigation controls', async ({ page }) => {
    await page.goto(APP_URL);
    await page.waitForSelector('journal-app', { timeout: 10000 });
    
    // Check for date picker
    const datePicker = page.locator('#date-picker');
    await expect(datePicker).toBeVisible({ timeout: 5000 });
    
    // Check for previous day button
    const prevBtn = page.locator('#prev-day');
    await expect(prevBtn).toBeVisible();
    
    // Check for next day button
    const nextBtn = page.locator('#next-day');
    await expect(nextBtn).toBeVisible();
  });

  test('should initialize with today\'s date', async ({ page }) => {
    await page.goto(APP_URL);
    await page.waitForSelector('#date-picker', { timeout: 10000 });
    
    const datePicker = page.locator('#date-picker');
    const dateValue = await datePicker.inputValue();
    
    const today = new Date().toISOString().slice(0, 10);
    expect(dateValue).toBe(today);
  });

  test('should display settings button', async ({ page }) => {
    await page.goto(APP_URL);
    await page.waitForSelector('journal-app', { timeout: 10000 });
    
    const settingsBtn = page.locator('#settings-btn');
    await expect(settingsBtn).toBeVisible();
    await expect(settingsBtn).toHaveText(/Settings/i);
  });
});
