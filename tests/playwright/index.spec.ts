import { test } from '@playwright/test';
import { cleanupRootDirs } from './helpers/cleanup';

test.beforeAll(() => {
  cleanupRootDirs();
});

test.afterAll(() => {
  cleanupRootDirs();
});

test('sanity', async () => {
  // no-op; ensures cleanup hooks run
});
