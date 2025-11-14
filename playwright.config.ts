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
  reporter: [['list'], ['html', { outputFolder: 'test-results/html-report' }]],
});
