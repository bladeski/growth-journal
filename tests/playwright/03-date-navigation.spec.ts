import { test, expect } from '@playwright/test';

const APP_URL = process.env.APP_URL || 'http://localhost:3000/';

test.describe('Date Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(APP_URL);
    await page.waitForSelector('journal-app', { timeout: 10000 });
    await page.waitForSelector('#date-picker', { timeout: 10000 });
  });

  test('should navigate to previous day', async ({ page }) => {
    const datePicker = page.locator('#date-picker');
    const initialDate = await datePicker.inputValue();
    
    const prevBtn = page.locator('#prev-day');
    await prevBtn.click();
    
    // Wait for date to update
    await page.waitForTimeout(500);
    
    const newDate = await datePicker.inputValue();
    expect(newDate).not.toBe(initialDate);
    
    // Verify it's one day earlier
    const initial = new Date(initialDate);
    const updated = new Date(newDate);
    const diff = initial.getTime() - updated.getTime();
    const dayInMs = 24 * 60 * 60 * 1000;
    expect(diff).toBe(dayInMs);
  });

  test('should disable next button on today', async ({ page }) => {
    const datePicker = page.locator('#date-picker');
    const today = new Date().toISOString().slice(0, 10);
    
    await datePicker.fill(today);
    await datePicker.blur();
    await page.waitForTimeout(500);
    
    const nextBtn = page.locator('#next-day');
    await expect(nextBtn).toBeDisabled();
  });

  test('should enable next button on past dates', async ({ page }) => {
    const datePicker = page.locator('#date-picker');
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);
    
    await datePicker.fill(yesterdayStr);
    await datePicker.blur();
    await page.waitForTimeout(500);
    
    const nextBtn = page.locator('#next-day');
    await expect(nextBtn).not.toBeDisabled();
  });

  test('should navigate to next day from past date', async ({ page }) => {
    const datePicker = page.locator('#date-picker');
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);
    
    await datePicker.fill(yesterdayStr);
    await datePicker.blur();
    await page.waitForTimeout(500);
    
    const nextBtn = page.locator('#next-day');
    await nextBtn.click();
    await page.waitForTimeout(500);
    
    const newDate = await datePicker.inputValue();
    const today = new Date().toISOString().slice(0, 10);
    expect(newDate).toBe(today);
  });

  test('should allow manual date selection', async ({ page }) => {
    const datePicker = page.locator('#date-picker');
    const targetDate = '2026-01-15';
    
    await datePicker.fill(targetDate);
    await datePicker.blur();
    await page.waitForTimeout(500);
    
    const selectedDate = await datePicker.inputValue();
    expect(selectedDate).toBe(targetDate);
  });

  test('should prevent selecting future dates', async ({ page }) => {
    const datePicker = page.locator('#date-picker');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().slice(0, 10);
    
    await datePicker.fill(tomorrowStr);
    await datePicker.blur();
    await page.waitForTimeout(500);
    
    // Should clamp to today
    const selectedDate = await datePicker.inputValue();
    const today = new Date().toISOString().slice(0, 10);
    expect(selectedDate).toBe(today);
  });

  // test('should reload journal data when changing dates', async ({ page }) => {
  //   // Fill in some data today
  //   const morningSection = page.locator('summary:has-text("Morning Reset")').first();
  //   await morningSection.click();
    
  //   const firstInput = page.locator('journal-section input[type="text"], journal-section textarea').first();
  //   await firstInput.waitFor({ state: 'visible', timeout: 5000 });
  //   await firstInput.fill('Today data');
    
  //   // Navigate to yesterday
  //   const prevBtn = page.locator('#prev-day');
  //   await prevBtn.click();
  //   await page.waitForTimeout(1000);
    
  //   // Open morning section again
  //   await morningSection.click();
  //   await firstInput.waitFor({ state: 'visible', timeout: 5000 });
    
  //   // Should be empty (different day)
  //   const value = await firstInput.inputValue();
  //   expect(value).toBe('');
    
  //   // Navigate back to today
  //   const nextBtn = page.locator('#next-day');
  //   await nextBtn.click();
  //   await page.waitForTimeout(1000);
    
  //   // Should have the data we entered
  //   await morningSection.click();
  //   await firstInput.waitFor({ state: 'visible', timeout: 5000 });
  //   const todayValue = await firstInput.inputValue();
  //   expect(todayValue).toBe('Today data');
  // });
});
