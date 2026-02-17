import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const src = path.join(root, 'src');
const dist = path.join(root, 'dist');

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function copyFile(srcFile, destDir, destName) {
  await fs.mkdir(destDir, { recursive: true });
  await fs.copyFile(srcFile, path.join(destDir, destName ?? path.basename(srcFile)));
}

async function copyDir(srcDir, destDir) {
  await fs.mkdir(destDir, { recursive: true });
  const entries = await fs.readdir(srcDir, { withFileTypes: true });
  for (const e of entries) {
    const from = path.join(srcDir, e.name);
    const to = path.join(destDir, e.name);
    if (e.isDirectory()) await copyDir(from, to);
    else if (e.isFile()) await fs.copyFile(from, to);
  }
}

async function main() {
  await copyFile(path.join(src, 'manifest.json'), dist);

  const swBuilt = path.join(dist, 'sw.js');
  if (await exists(swBuilt)) {
    await copyFile(swBuilt, dist, 'sw.js');
  } else {
    await copyFile(path.join(src, 'sw.ts'), dist, 'sw.js');
  }

  const iconsDir = path.join(src, 'icons');
  if (await exists(iconsDir)) {
    await copyDir(iconsDir, path.join(dist, 'icons'));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});