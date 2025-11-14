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
}
