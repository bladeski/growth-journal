import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const src = path.join(root, 'src');
const devDist = path.join(root, 'dev-dist');

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

async function newestSwFile(dir) {
  if (!(await exists(dir))) return null;
  const files = await fs.readdir(dir);
  const swFiles = files.filter((f) => /^sw\..*\.js$/i.test(f));
  if (swFiles.length === 0) return null;

  let newest = null;
  let newestTime = -1;
  for (const f of swFiles) {
    const p = path.join(dir, f);
    const stat = await fs.stat(p);
    if (stat.mtimeMs > newestTime) {
      newestTime = stat.mtimeMs;
      newest = p;
    }
  }
  return newest;
}

async function main() {
  await copyFile(path.join(src, 'manifest.json'), devDist);

  const swCandidate = await newestSwFile(devDist);
  if (swCandidate) {
    await copyFile(swCandidate, devDist, 'sw.js');
  } else {
    await copyFile(path.join(src, 'sw.ts'), devDist, 'sw.js');
  }

  const iconsDir = path.join(src, 'icons');
  if (await exists(iconsDir)) {
    await copyDir(iconsDir, path.join(devDist, 'icons'));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});