import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { getPort } from 'get-port-please';

/**
 * Prefer port 3000; fall back if busy.
 * TippyMe is a single Nuxt/Nitro process (API + SSR).
 */
const host = 'localhost';
const port = await getPort({
  port: 3000,
  ports: [3000, 3020, 3021, 3022],
  host,
});

if (port !== 3000) {
  console.warn(
    `[cheer] Port 3000 is busy — using http://${host}:${port}`,
  );
}

const webRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const child = spawn(
  process.platform === 'win32' ? 'nuxi.cmd' : 'nuxi',
  ['dev', '--port', String(port), '--host', host],
  {
    cwd: webRoot,
    stdio: 'inherit',
    shell: true,
    env: process.env,
  },
);

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
