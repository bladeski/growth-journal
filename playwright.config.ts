import { defineConfig } from '@playwright/test';
import path from 'path';

export default defineConfig({
  testDir: './tests',
  outputDir: path.join(process.cwd(), 'test-results'),
  use: {
    headless: true,
    viewport: { width: 1280, height: 800 },
    actionTimeout: 10000,
    navigationTimeout: 20000,
    // Accept downloads by default
    contextOptions: {
      acceptDownloads: true,
    },
  },
  // Write test results to `test-results` and keep the HTML report
  // in a sibling folder to avoid Playwright clearing the results dir.
  reporter: [['list'], ['html', { outputFolder: 'playwright-html-report' }]],
});
