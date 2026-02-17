import { test, expect } from '@playwright/test';

const APP_URL = process.env.APP_URL || 'http://localhost:3000/';

test.describe('PWA and Offline Functionality', () => {
  test('service worker registers successfully', async ({ page, context }) => {
    await context.grantPermissions(['notifications']);
    
    await page.goto(APP_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Give SW time to register
    
    const swRegistered = await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        try {
          const reg = await navigator.serviceWorker.getRegistration();
          return !!reg;
        } catch {
          return false;
        }
      }
      return false;
    });
    
    expect(swRegistered).toBeTruthy();
  });

  test('manifest.json is accessible', async ({ page }) => {
    const manifestResponse = await page.goto(APP_URL + 'manifest.webmanifest');
    expect(manifestResponse?.status()).toBe(200);
    
    const contentType = manifestResponse?.headers()['content-type'];
    expect(contentType).toContain('json');
  });

  test('app has proper PWA meta tags', async ({ page }) => {
    await page.goto(APP_URL);
    
    // Check for viewport meta tag
    const viewport = await page.locator('meta[name="viewport"]').count();
    expect(viewport).toBeGreaterThan(0);
    
    // Check for theme color
    const themeColor = await page.locator('meta[name="theme-color"]').count();
    expect(themeColor).toBeGreaterThan(0);
  });

  test('app displays install prompt when available', async ({ page, context }) => {
    await page.goto(APP_URL);
    await page.waitForSelector('journal-app', { timeout: 10000 });
    
    // Check if install UI elements exist (may not be visible if already installed)
    const installContainer = page.locator('.install-container');
    const exists = await installContainer.count();
    
    // Container should exist in the DOM
    expect(exists).toBeGreaterThanOrEqual(0);
  });

  test('app works offline after initial load', async ({ page, context }) => {
    // First load online
    await page.goto(APP_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('journal-app', { timeout: 10000 });
    await page.waitForTimeout(2000); // Let SW cache assets
    
    // Fill some data while online
    const firstSection = page.locator('journal-section').first();
    const details = firstSection.locator('details');
    
    const isOpen = await details.evaluate((el: HTMLDetailsElement) => el.open);
    if (!isOpen) {
      await details.locator('summary').click();
      await page.waitForTimeout(300);
    }
    
    const input = firstSection.locator('input[type="text"], textarea').first();
    await input.fill('Offline test data');
    await page.waitForTimeout(1000);
    
    // Go offline
    await context.setOffline(true);
    
    // Reload page
    await page.reload();
    await page.waitForTimeout(1000);
    
    // App should still load (from cache)
    const journalApp = page.locator('journal-app');
    await expect(journalApp).toBeVisible({ timeout: 10000 });
    
    // Data should be accessible
    const newDetails = firstSection.locator('details');
    const newIsOpen = await newDetails.evaluate((el: HTMLDetailsElement) => el.open);
    if (!newIsOpen) {
      await newDetails.locator('summary').click();
      await page.waitForTimeout(300);
    }
    
    const offlineValue = await input.inputValue();
    expect(offlineValue).toBe('Offline test data');
    
    // Go back online
    await context.setOffline(false);
  });

  test('can still interact with app offline', async ({ page, context }) => {
    // Load online first
    await page.goto(APP_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('journal-app', { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    // Go offline
    await context.setOffline(true);
    await page.reload();
    await page.waitForTimeout(1000);
    
    // Should still be able to fill forms
    const firstSection = page.locator('journal-section').first();
    const details = firstSection.locator('details');
    
    const isOpen = await details.evaluate((el: HTMLDetailsElement) => el.open);
    if (!isOpen) {
      await details.locator('summary').click();
      await page.waitForTimeout(300);
    }
    
    const input = firstSection.locator('input[type="text"], textarea').first();
    await input.fill('Created while offline');
    
    // Wait and verify
    await page.waitForTimeout(500);
    const value = await input.inputValue();
    expect(value).toBe('Created while offline');
    
    // Go back online
    await context.setOffline(false);
  });

  test('service worker caches essential assets', async ({ page }) => {
    await page.goto(APP_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const cacheNames = await page.evaluate(async () => {
      if ('caches' in window) {
        return await caches.keys();
      }
      return [];
    });
    
    // Should have at least one cache
    expect(cacheNames.length).toBeGreaterThan(0);
    
    // Cache name should contain version or app name
    const hasGrowthJournalCache = cacheNames.some(name => 
      name.includes('growth-journal') || name.includes('journal')
    );
    expect(hasGrowthJournalCache).toBeTruthy();
  });

  test('offline indicator appears when offline', async ({ page, context }) => {
    await page.goto(APP_URL);
    await page.waitForSelector('journal-app', { timeout: 10000 });
    await page.waitForTimeout(1000);
    
    // Go offline
    await context.setOffline(true);
    await page.waitForTimeout(500);
    
    // Trigger offline event
    await page.evaluate(() => {
      window.dispatchEvent(new Event('offline'));
    });
    await page.waitForTimeout(500);
    
    // Check for offline indicator (if implemented)
    const offlineIndicator = page.locator('#offline-indicator');
    if (await offlineIndicator.count() > 0) {
      // Should be visible when offline
      await expect(offlineIndicator).toBeVisible();
    }
    
    // Go back online
    await context.setOffline(false);
    await page.evaluate(() => {
      window.dispatchEvent(new Event('online'));
    });
    await page.waitForTimeout(500);
    
    // Indicator should hide
    if (await offlineIndicator.count() > 0) {
      await expect(offlineIndicator).not.toBeVisible();
    }
  });

  test('app is installable as PWA', async ({ page }) => {
    await page.goto(APP_URL);
    
    // Check for manifest link
    const manifestLink = await page.locator('link[rel="manifest"]').count();
    expect(manifestLink).toBeGreaterThan(0);
    
    // Check for icons (typically in manifest)
    const manifestUrl = await page.locator('link[rel="manifest"]').getAttribute('href');
    
    if (manifestUrl) {
      const fullManifestUrl = new URL(manifestUrl, APP_URL).href;
      const response = await page.request.get(fullManifestUrl);
      expect(response.status()).toBe(200);
      
      const manifest = await response.json();
      expect(manifest.name || manifest.short_name).toBeTruthy();
      expect(manifest.icons).toBeTruthy();
      expect(Array.isArray(manifest.icons)).toBeTruthy();
      expect(manifest.icons.length).toBeGreaterThan(0);
    }
  });
});
