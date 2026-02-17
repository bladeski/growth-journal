import { test, expect } from '@playwright/test';

const APP_URL = process.env.APP_URL || 'http://localhost:3000/';

test.describe('Data Persistence', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(APP_URL);
    await page.waitForSelector('journal-app', { timeout: 10000 });
    await page.waitForTimeout(500);
  });

  test('journal entries auto-save', async ({ page }) => {
    const firstSection = page.locator('journal-section').first();
    const details = firstSection.locator('details');
    
    // Expand section
    const isOpen = await details.evaluate((el: HTMLDetailsElement) => el.open);
    if (!isOpen) {
      await details.locator('summary').click();
      await page.waitForTimeout(300);
    }
    
    // Fill in data
    const input = firstSection.locator('input[type="text"], textarea').first();
    const testData = 'Test entry for persistence ' + Date.now();
    await input.fill(testData);
    
    // Wait for autosave (typically triggers after a delay)
    await page.waitForTimeout(1000);
    
    // Reload page
    await page.reload();
    await page.waitForSelector('journal-app', { timeout: 10000 });
    await page.waitForTimeout(500);
    
    // Expand section again
    const newDetails = firstSection.locator('details');
    const newIsOpen = await newDetails.evaluate((el: HTMLDetailsElement) => el.open);
    if (!newIsOpen) {
      await newDetails.locator('summary').click();
      await page.waitForTimeout(300);
    }
    
    // Data should be persisted
    const savedValue = await input.inputValue();
    expect(savedValue).toBe(testData);
  });

  test('IndexedDB stores journal entries', async ({ page }) => {
    // Check if data exists in IndexedDB
    const hasData = await page.evaluate(async () => {
      const dbName = 'journal-db';
      
      return new Promise((resolve) => {
        const req = indexedDB.open(dbName);
        
        req.onsuccess = () => {
          const db = req.result;
          const hasEntries = db.objectStoreNames.contains('entries');
          db.close();
          resolve(hasEntries);
        };
        
        req.onerror = () => resolve(false);
      });
    });
    
    expect(hasData).toBeTruthy();
  });

  test('can store and retrieve entries for different dates', async ({ page }) => {
    // Fill today's entry
    const firstSection = page.locator('journal-section').first();
    const details = firstSection.locator('details');
    
    const isOpen = await details.evaluate((el: HTMLDetailsElement) => el.open);
    if (!isOpen) {
      await details.locator('summary').click();
      await page.waitForTimeout(300);
    }
    
    const input = firstSection.locator('input[type="text"], textarea').first();
    await input.fill('Today entry');
    await page.waitForTimeout(1000);
    
    // Navigate to yesterday
    const prevBtn = page.locator('#prev-day');
    await prevBtn.click();
    await page.waitForTimeout(500);
    
    // Fill yesterday's entry
    const isOpen2 = await details.evaluate((el: HTMLDetailsElement) => el.open);
    if (!isOpen2) {
      await details.locator('summary').click();
      await page.waitForTimeout(300);
    }
    
    await input.fill('Yesterday entry');
    await page.waitForTimeout(1000);
    
    // Navigate back to today
    const nextBtn = page.locator('#next-day');
    await nextBtn.click();
    await page.waitForTimeout(500);
    
    // Verify today's entry is still there
    const isOpen3 = await details.evaluate((el: HTMLDetailsElement) => el.open);
    if (!isOpen3) {
      await details.locator('summary').click();
      await page.waitForTimeout(300);
    }
    
    const todayValue = await input.inputValue();
    expect(todayValue).toBe('Today entry');
    
    // Navigate back to yesterday and verify
    await prevBtn.click();
    await page.waitForTimeout(500);
    
    const isOpen4 = await details.evaluate((el: HTMLDetailsElement) => el.open);
    if (!isOpen4) {
      await details.locator('summary').click();
      await page.waitForTimeout(300);
    }
    
    const yesterdayValue = await input.inputValue();
    expect(yesterdayValue).toBe('Yesterday entry');
  });

  test('growth area setting persists across sessions', async ({ page }) => {
    // Open settings
    const settingsBtn = page.locator('#settings-btn');
    await settingsBtn.click();
    await page.waitForTimeout(300);
    
    const growthAreaSelect = page.locator('#setting-growth-area');
    const options = await growthAreaSelect.locator('option').count();
    
    if (options > 1) {
      // Select an option
      await growthAreaSelect.selectOption({ index: 1 });
      const selectedValue = await growthAreaSelect.inputValue();
      await page.waitForTimeout(500);
      
      // Close dialog
      const closeBtn = page.locator('#settings button[data-action="click:closeSettings"]');
      if (await closeBtn.count() > 0) {
        await closeBtn.click();
        await page.waitForTimeout(300);
      }
      
      // Reload page
      await page.reload();
      await page.waitForSelector('journal-app', { timeout: 10000 });
      await page.waitForTimeout(500);
      
      // Open settings again
      await settingsBtn.click();
      await page.waitForTimeout(300);
      
      // Selection should be preserved
      const newValue = await growthAreaSelect.inputValue();
      expect(newValue).toBe(selectedValue);
    }
  });

  test('data persists when navigating away and back', async ({ page }) => {
    // Fill some data
    const firstSection = page.locator('journal-section').first();
    const details = firstSection.locator('details');
    
    const isOpen = await details.evaluate((el: HTMLDetailsElement) => el.open);
    if (!isOpen) {
      await details.locator('summary').click();
      await page.waitForTimeout(300);
    }
    
    const input = firstSection.locator('input[type="text"], textarea').first();
    const uniqueValue = 'Unique test value ' + Date.now();
    await input.fill(uniqueValue);
    await page.waitForTimeout(1000);
    
    // Navigate to a different URL (simulating navigating away)
    await page.goto('about:blank');
    await page.waitForTimeout(500);
    
    // Navigate back to app
    await page.goto(APP_URL);
    await page.waitForSelector('journal-app', { timeout: 10000 });
    await page.waitForTimeout(500);
    
    // Expand section
    const newDetails = firstSection.locator('details');
    const newIsOpen = await newDetails.evaluate((el: HTMLDetailsElement) => el.open);
    if (!newIsOpen) {
      await newDetails.locator('summary').click();
      await page.waitForTimeout(300);
    }
    
    // Data should still be there
    const savedValue = await input.inputValue();
    expect(savedValue).toBe(uniqueValue);
  });

  test('timestamp updates when entry is modified', async ({ page }) => {
    const firstSection = page.locator('journal-section').first();
    const details = firstSection.locator('details');
    
    const isOpen = await details.evaluate((el: HTMLDetailsElement) => el.open);
    if (!isOpen) {
      await details.locator('summary').click();
      await page.waitForTimeout(300);
    }
    
    const input = firstSection.locator('input[type="text"], textarea').first();
    
    // Fill data and wait
    await input.fill('First value');
    await page.waitForTimeout(1000);
    
    // Get timestamp from IndexedDB
    const firstTimestamp = await page.evaluate(async () => {
      const dbName = 'journal-db';
      const today = new Date().toISOString().slice(0, 10);
      
      return new Promise((resolve) => {
        const req = indexedDB.open(dbName);
        
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction('entries', 'readonly');
          const store = tx.objectStore('entries');
          const getReq = store.get(today);
          
          getReq.onsuccess = () => {
            const entry = getReq.result;
            db.close();
            resolve(entry ? entry.updatedAt : null);
          };
          
          getReq.onerror = () => {
            db.close();
            resolve(null);
          };
        };
        
        req.onerror = () => resolve(null);
      });
    });
    
    // Modify data
    await input.fill('Second value');
    await page.waitForTimeout(1000);
    
    // Get new timestamp
    const secondTimestamp = await page.evaluate(async () => {
      const dbName = 'journal-db';
      const today = new Date().toISOString().slice(0, 10);
      
      return new Promise((resolve) => {
        const req = indexedDB.open(dbName);
        
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction('entries', 'readonly');
          const store = tx.objectStore('entries');
          const getReq = store.get(today);
          
          getReq.onsuccess = () => {
            const entry = getReq.result;
            db.close();
            resolve(entry ? entry.updatedAt : null);
          };
          
          getReq.onerror = () => {
            db.close();
            resolve(null);
          };
        };
        
        req.onerror = () => resolve(null);
      });
    });
    
    // Timestamps should be different
    expect(firstTimestamp).toBeTruthy();
    expect(secondTimestamp).toBeTruthy();
    expect(secondTimestamp).not.toBe(firstTimestamp);
  });
});
