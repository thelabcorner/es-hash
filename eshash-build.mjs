#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const ROOT = dirname(fileURLToPath(import.meta.url));
const DIST = join(ROOT, 'dist');
const ESTC = join(ROOT, '..', 'extendscript-toolchain', 'bin', 'estc.mjs');
const ESB64_RUNTIME = join(ROOT, '..', 'esb64', 'dist', 'vendor-esb64-runtime.js');
const ESB64_ACCEL = join(ROOT, '..', 'esb64', 'native', 'bin', 'ESB64Native.dll');
const REQUIRE_ACCEL = process.argv.includes('--require-accel');

const ACCELERATOR = [
  '',
  '(function () {',
  '  if (typeof ESPAK !== "object" || !ESPAK || typeof ESPAK.load !== "function") return;',
  '  if (typeof ESHASH !== "object" || !ESHASH || typeof ESHASH.enableNativeGate !== "function") return;',
  '  function useEspack(options) {',
  '    options = options || {};',
  '    var loaded = ESPAK.load("ESHASHNative");',
  '    if (!loaded.ok || loaded.mode !== "native" || !loaded.lib) {',
  '      return { ok: false, reason: (loaded && loaded.error) || "ESPAK load failed" };',
  '    }',
  '    var status;',
  '    try {',
  '      status = ESHASH.enableNativeGate({',
  '        lib: loaded.lib,',
  '        dllPath: loaded.path,',
  '        owned: false,',
  '        source: "espack",',
  '        routes: { sha256: true, crc32: options.crc32 === true }',
  '      });',
  '    } catch (gateError) {',
  '      return { ok: false, reason: String(gateError), path: loaded.path };',
  '    }',
  '    return { ok: true, path: loaded.path, status: status };',
  '  }',
  '  ESHASH.useEspack = useEspack;',
  '  ESHASH.espack = useEspack();',
  '  var g = null;',
  '  try { if (typeof $ !== "undefined" && $.global) g = $.global; } catch (ignoreGlobal) {}',
  '  if (g) { g.ESHASH = ESHASH; g.ESPAK = ESPAK; }',
  '}());',
  ''
].join('\n');

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

function accelSkip(reason) {
  if (REQUIRE_ACCEL) throw new Error('[eshash-build] accelerator required: ' + reason);
  console.log('[eshash-build] accel skipped: ' + reason);
}

function estcCheck(file) {
  execFileSync(process.execPath, [ESTC, 'check', file, '--no-target'], {
    cwd: ROOT,
    stdio: 'inherit'
  });
}

function minifyAccel(accelOut) {
  const skillDir = join(ROOT, '..', 'agent-skills', 'adobe-extendscript-minification');
  const minifyScript = join(skillDir, 'scripts', 'minify-jsx.py');
  const minifyConfig = join(skillDir, 'configs', 'conservative.json');
  if (!existsSync(minifyScript) || !existsSync(minifyConfig)) {
    if (REQUIRE_ACCEL) throw new Error('[eshash-build] minification skill is required for accelerator release');
    console.log('[eshash-build] accel minify skipped: minification skill unavailable');
    return;
  }
  const bannerMatch = accelOut.match(/^\/\*[\s\S]*?\*\//);
  const banner = bannerMatch ? bannerMatch[0] : '';
  const body = bannerMatch ? accelOut.substring(banner.length) : accelOut;
  const bodyPath = join(DIST, '.eshash-accel-bundle.body.jsx');
  const minPath = join(DIST, '.eshash-accel-bundle.min.jsx');
  writeFileSync(bodyPath, body, 'utf8');
  execFileSync('python', [minifyScript, '--in', bodyPath, '--config', minifyConfig, '--out', minPath], {
    cwd: ROOT,
    stdio: 'inherit'
  });
  const minBody = readFileSync(minPath, 'utf8');
  const minOut = (banner ? banner + '\n' : '') + minBody;
  writeFileSync(join(DIST, 'ESHASH.accel.min.jsx'), minOut, 'utf8');
  estcCheck('dist/ESHASH.accel.min.jsx');
}

function buildAccel() {
  const espackBuild = join(ROOT, '..', 'espack', 'espack-build.mjs');
  const payloadDll = join(DIST, 'native', 'release', 'ESHASHNative.dll');
  if (!existsSync(espackBuild)) return accelSkip('sibling espack build tool is unavailable');
  if (!existsSync(payloadDll)) return accelSkip('native release DLL missing; run npm run build:native');
  if (!existsSync(ESB64_RUNTIME)) return accelSkip('current ESB64 runtime missing; build ../esb64 first');
  if (!existsSync(ESB64_ACCEL)) return accelSkip('current ESB64Native accelerator missing; build ../esb64 native first');

  const loaderOut = join(DIST, '.eshash-accel-bundle.jsx');
  const manifestOut = join(DIST, 'ESHASH.manifest.json');
  execFileSync(process.execPath, [
    espackBuild,
    '--embed', payloadDll,
    '--out', loaderOut,
    '--name', 'eshash',
    '--manifest-out', manifestOut,
    '--accel', ESB64_ACCEL,
    '--accel-version', '2',
    '--quiet'
  ], {
    cwd: ROOT,
    stdio: 'inherit',
    env: Object.assign({}, process.env, { ESB64_RUNTIME_PATH: ESB64_RUNTIME })
  });

  const loaderText = readFileSync(loaderOut, 'utf8');
  const facadeText = readFileSync(join(DIST, 'ESHASH.jsx'), 'utf8');
  const facadeOut = facadeText + '\n' + ACCELERATOR +
    '// ESHASH.facade.jsx - loader-free facade + ESPACK adapter; requires ESPAK on $.global\n';
  const accelOut = loaderText + '\n' + facadeText + '\n' + ACCELERATOR +
    '// ESHASH.accel.jsx - self-extracting ESPACK bundle + ESHASHNative gate\n';
  writeFileSync(join(DIST, 'ESHASH.facade.jsx'), facadeOut, 'utf8');
  writeFileSync(join(DIST, 'ESHASH.accel.jsx'), accelOut, 'utf8');
  estcCheck('dist/ESHASH.facade.jsx');
  estcCheck('dist/ESHASH.accel.jsx');
  minifyAccel(accelOut);
  console.log('[eshash-build] wrote ESPACK accelerator, facade, manifest, and minified accelerator');
}

if (process.argv.includes('--accel')) buildAccel();

console.log('[eshash-build] wrote dist/ESHASH.jsx and dist/eshash-core.esm.mjs');
