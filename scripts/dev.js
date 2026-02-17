import { spawn } from 'node:child_process';

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: 'inherit', shell: true, ...opts });
    p.on('error', reject);
    p.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))));
  });
}

function start(cmd, args, opts = {}) {
  return spawn(cmd, args, { stdio: 'inherit', shell: true, ...opts });
}

async function main() {
  await run('npm', ['run', 'build:dictionaries:dev']);

  const buildSw = start('npm', ['run', 'build:sw:dev']);
  const parcel = start('parcel', ['src/index.pug', '--port', '3000', '--dist-dir', 'dev-dist']);

  const shutdown = () => {
    if (!buildSw.killed) buildSw.kill();
    if (!parcel.killed) parcel.kill();
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  parcel.on('exit', (code) => {
    shutdown();
    process.exit(code ?? 0);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});