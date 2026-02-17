import { test, expect } from '@playwright/test';

const APP_URL = process.env.APP_URL || 'http://localhost:3000/';

test.describe('Journal Sections', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(APP_URL);
    await page.waitForSelector('journal-app', { timeout: 10000 });
    await page.waitForSelector('journal-day', { timeout: 10000 });
  });

  test('should display all four main sections', async ({ page }) => {
    // Wait for sections to be rendered
    const sections = page.locator('journal-section');
    await expect(sections).toHaveCount(4, { timeout: 10000 });
  });

  test('should display section titles', async ({ page }) => {
    await page.waitForSelector('journal-section', { timeout: 10000 });
    
    // Check for section headings (using details > summary pattern)
    const morningSection = page.locator('summary:has-text("Morning Reset")').first();
    const middaySection = page.locator('summary:has-text("Midday Check-in")').first();
    const eveningSection = page.locator('summary:has-text("Evening Reflection")').first();
    const accountabilitySection = page.locator('summary:has-text("Accountability")').first();
    
    await expect(morningSection).toBeVisible({ timeout: 5000 });
    await expect(middaySection).toBeVisible({ timeout: 5000 });
    await expect(eveningSection).toBeVisible({ timeout: 5000 });
    await expect(accountabilitySection).toBeVisible({ timeout: 5000 });
  });

  test('should expand and collapse sections', async ({ page }) => {
    await page.waitForSelector('journal-section details', { timeout: 10000 });
    
    const firstSection = page.locator('journal-section details').first();
    const firstSummary = firstSection.locator('summary');
    
    // Click to expand
    await firstSummary.click();
    await expect(firstSection).toHaveAttribute('open', '');
    
    // Click to collapse
    await firstSummary.click();
    await expect(firstSection).not.toHaveAttribute('open', '');
  });

  // test('should display morning gratitude questions', async ({ page }) => {
  //   // Open morning section
  //   const morningSection = page.locator('summary:has-text("Morning Reset")').first();
  //   await morningSection.click();
    
  //   // Check for three gratitude inputs (based on template.json)
  //   const inputs = page.locator('journal-section >> input[type="text"], journal-section >> textarea').first();
  //   await expect(inputs).toBeVisible({ timeout: 5000 });
  // });

  test('should allow text input in morning section', async ({ page }) => {
    const morningSection = page.locator('summary:has-text("Morning Reset")').first();
    await morningSection.click();
    
    // Find first input in morning section
    const firstInput = page.locator('journal-section input[type="text"], journal-section textarea').first();
    await firstInput.waitFor({ state: 'visible', timeout: 5000 });
    
    const testValue = 'Grateful for my family';
    await firstInput.fill(testValue);
    
    const value = await firstInput.inputValue();
    expect(value).toBe(testValue);
  });

  test('should display midday check-in questions', async ({ page }) => {
    const middaySection = page.locator('summary:has-text("Midday Check-in")').first();
    await middaySection.click();
    
    // Should have inputs for emotion, trigger, body, thought, reframe, progress
    const inputs = page.locator('journal-section').nth(1).locator('input, textarea');
    const count = await inputs.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should display evening reflection questions', async ({ page }) => {
    const eveningSection = page.locator('summary:has-text("Evening Reflection")').first();
    await eveningSection.click();
    
    // Should have inputs for challenge, struggle, proud, try-again
    const inputs = page.locator('journal-section').nth(2).locator('input, textarea');
    const count = await inputs.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should display accountability question', async ({ page }) => {
    const accountabilitySection = page.locator('summary:has-text("Accountability")').first();
    await accountabilitySection.click();
    
    // Should have a select dropdown for partner check-in
    const select = page.locator('journal-section').nth(3).locator('select');
    await expect(select).toBeVisible({ timeout: 5000 });
  });

  test('should allow selecting accountability option', async ({ page }) => {
    const accountabilitySection = page.locator('summary:has-text("Accountability")').first();
    await accountabilitySection.click();
    
    const select = page.locator('journal-section').nth(3).locator('select');
    await select.waitFor({ state: 'visible', timeout: 5000 });
    
    // Select "yes" option
    await select.selectOption('yes');
    const value = await select.inputValue();
    expect(value).toBe('yes');
  });
});
