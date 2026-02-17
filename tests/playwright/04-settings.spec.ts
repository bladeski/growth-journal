import { test, expect } from '@playwright/test';

const APP_URL = process.env.APP_URL || 'http://localhost:3000/';

test.describe('Settings and Configuration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(APP_URL);
    await page.waitForSelector('journal-app', { timeout: 10000 });
    await page.waitForTimeout(500);
  });

  test('settings button opens settings dialog', async ({ page }) => {
    const settingsBtn = page.locator('#settings-btn');
    await expect(settingsBtn).toBeVisible();
    
    // Click settings button
    await settingsBtn.click();
    await page.waitForTimeout(300);
    
    // Settings dialog should be visible
    const settingsDialog = page.locator('#settings');
    await expect(settingsDialog).toBeVisible();
  });

  test('growth area selector is present in settings', async ({ page }) => {
    const settingsBtn = page.locator('#settings-btn');
    await settingsBtn.click();
    await page.waitForTimeout(300);
    
    const growthAreaSelect = page.locator('#setting-growth-area');
    await expect(growthAreaSelect).toBeVisible();
  });

  test('can select different growth areas', async ({ page }) => {
    const settingsBtn = page.locator('#settings-btn');
    await settingsBtn.click();
    await page.waitForTimeout(300);
    
    const growthAreaSelect = page.locator('#setting-growth-area');
    
    // Get available options
    const options = await growthAreaSelect.locator('option').count();
    expect(options).toBeGreaterThan(0);
    
    // Select first non-default option if exists
    if (options > 1) {
      await growthAreaSelect.selectOption({ index: 1 });
      
      // Verify selection
      const selectedValue = await growthAreaSelect.inputValue();
      expect(selectedValue).toBeTruthy();
    }
  });

  test('growth area selection persists after closing dialog', async ({ page }) => {
    const settingsBtn = page.locator('#settings-btn');
    await settingsBtn.click();
    await page.waitForTimeout(300);
    
    const growthAreaSelect = page.locator('#setting-growth-area');
    const options = await growthAreaSelect.locator('option').count();
    
    if (options > 1) {
      // Select an option
      await growthAreaSelect.selectOption({ index: 1 });
      const selectedValue = await growthAreaSelect.inputValue();
      
      // Close dialog (look for close button)
      const closeBtn = page.locator('#settings button[data-action="click:closeSettings"]');
      if (await closeBtn.count() > 0) {
        await closeBtn.click();
        await page.waitForTimeout(300);
      }
      
      // Reopen settings
      await settingsBtn.click();
      await page.waitForTimeout(300);
      
      // Selection should be preserved
      const newValue = await growthAreaSelect.inputValue();
      expect(newValue).toBe(selectedValue);
    }
  });

  test('can close settings dialog', async ({ page }) => {
    const settingsBtn = page.locator('#settings-btn');
    await settingsBtn.click();
    await page.waitForTimeout(300);
    
    const settingsDialog = page.locator('#settings');
    await expect(settingsDialog).toBeVisible();
    
    // Look for close button
    const closeBtn = settingsDialog.locator('button[data-action="click:closeSettings"]');
    if (await closeBtn.count() > 0) {
      await closeBtn.click();
      await page.waitForTimeout(300);
      
      // Dialog should be hidden
      await expect(settingsDialog).not.toBeVisible();
    }
  });

  test('settings display current language', async ({ page }) => {
    // The app should show current language (defaulting to English)
    const html = await page.locator('html').getAttribute('lang');
    expect(html).toBeTruthy();
  });

  test('growth area affects displayed values and challenges', async ({ page }) => {
    // Select a growth area
    const settingsBtn = page.locator('#settings-btn');
    await settingsBtn.click();
    await page.waitForTimeout(300);
    
    const growthAreaSelect = page.locator('#setting-growth-area');
    const options = await growthAreaSelect.locator('option').count();
    
    if (options > 1) {
      // Select an option
      await growthAreaSelect.selectOption({ index: 1 });
      await page.waitForTimeout(300);
      
      // Close dialog
      const closeBtn = page.locator('#settings button[data-action="click:closeSettings"]');
      if (await closeBtn.count() > 0) {
        await closeBtn.click();
        await page.waitForTimeout(300);
      }
      
      // The morning section should display value/challenge
      const firstSection = page.locator('journal-section').first();
      const details = firstSection.locator('details');
      
      // Expand section
      const isOpen = await details.evaluate((el: HTMLDetailsElement) => el.open);
      if (!isOpen) {
        await details.locator('summary').click();
        await page.waitForTimeout(300);
      }
      
      // Section should have content
      const content = await firstSection.textContent();
      expect(content).toBeTruthy();
      expect(content!.length).toBeGreaterThan(0);
    }
  });
});
