#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const ROOT = dirname(fileURLToPath(import.meta.url));
const DIST = join(ROOT, 'dist');
const ESTC = join(ROOT, '..', 'extendscript-toolchain', 'bin', 'estc.mjs');

await mkdir(DIST, { recursive: true });

await build({
  entryPoints: [join(ROOT, 'src', 'index.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'es2019',
  outfile: join(DIST, 'eshash-core.esm.mjs'),
  logLevel: 'warning'
});

execFileSync(process.execPath, [ESTC, 'build', '--config', './extendscript.estc.config.mjs'], {
  cwd: ROOT,
  stdio: 'inherit'
});

console.log('[eshash-build] wrote dist/ESHASH.jsx and dist/eshash-core.esm.mjs');
