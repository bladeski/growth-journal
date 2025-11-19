import { defineConfig } from '@playwright/test';
import path from 'path';

export default defineConfig({
  testDir: './tests',
  outputDir: path.join(process.cwd(), 'test-results'),
  retries: 1,
  timeout: 120_000,
  workers: 1,
  use: {
    headless: true,
    viewport: { width: 1280, height: 800 },
    actionTimeout: 30_000,
    navigationTimeout: 60_000,
    // Capture trace for every test run in CI to ensure artifacts are available
    // (use 'on' so traces exist even when retries don't occur).
    trace: 'on',
    // Accept downloads by default
    contextOptions: {
      acceptDownloads: true,
    },
  },
  // Write test results to `test-results` and keep the HTML report
  // in a sibling folder to avoid Playwright clearing the results dir.
  reporter: [['list'], ['html', { outputFolder: 'playwright-html-report' }]],
});
