import fs from 'fs';
import path from 'path';

export function cleanupRootDirs() {
  const downloads = path.join(process.cwd(), 'downloads');
  const results = path.join(process.cwd(), 'test-results');
  try {
    if (fs.existsSync(downloads)) fs.rmSync(downloads, { recursive: true, force: true });
  } catch (e) {
    // ignore
  }
  try {
    if (fs.existsSync(results)) fs.rmSync(results, { recursive: true, force: true });
  } catch (e) {
    // ignore
  }
  // Do not remove Playwright's configured `playwright-artifacts` output directory here.
  // Playwright may create temporary `.playwright-artifacts-*` folders inside that directory
  // while packaging traces; removing it during the run can cause ENOENT when Playwright
  // attempts to open zipped trace files. The CI workflow will collect artifacts after
  // the job completes.
}
