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
const ESB64_MANIFEST = join(ROOT, '..', 'esb64', 'dist', 'ESB64.manifest.json');
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

function gitHead() {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
  } catch (ignore) {
    return '';
  }
}

async function buildAccel() {
  const espackBuild = join(ROOT, '..', 'espack', 'espack-build.mjs');
  const payloadDll = join(DIST, 'native', 'release', 'ESHASHNative.dll');
  if (!existsSync(espackBuild)) return accelSkip('sibling espack build tool is unavailable');
  if (!existsSync(payloadDll)) return accelSkip('native release DLL missing; run npm run build:native');
  if (!existsSync(ESB64_MANIFEST)) return accelSkip('current ESB64 v2 composition manifest missing; build ../esb64 first');

  const facadePath = join(DIST, 'ESHASH.facade.jsx');
  const facadeText = readFileSync(join(DIST, 'ESHASH.jsx'), 'utf8');
  const facadeOut = facadeText + '\n' + ACCELERATOR +
    '// ESHASH.facade.jsx - loader-free facade + ESPACK adapter; requires ESPAK on $.global\n';
  writeFileSync(facadePath, facadeOut, 'utf8');
  const packageInfo = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  const esb64Package = JSON.parse(readFileSync(join(ROOT, '..', 'esb64', 'package.json'), 'utf8'));
  const espackBuildApi = await import(new URL('../espack/espack-build.mjs', import.meta.url).href);
  const espackMergeApi = await import(new URL('../espack/espack-merge.mjs', import.meta.url).href);
  const espackLibraries = await import(new URL('../espack/espack-libraries.mjs', import.meta.url).href);
  const manifestOut = join(DIST, 'ESHASH.manifest.json');
  const payloadBytes = readFileSync(payloadDll);
  const library = espackLibraries.libraryFromFile({
    id: 'eshash',
    version: packageInfo.version,
    global: 'ESHASH',
    path: facadePath,
    requires: [{ id: 'esb64', range: '^' + esb64Package.version }],
    contract: [
      { name: 'createCrc32', type: 'function' },
      { name: 'createSha256', type: 'function' },
      { name: 'crc32Bytes', type: 'function' },
      { name: 'crc32Text', type: 'function' },
      { name: 'enableNativeGate', type: 'function' },
      { name: 'loadNative', type: 'function' },
      { name: 'nativeStatus', type: 'function' },
      { name: 'sha256Bytes', type: 'function' },
      { name: 'sha256Text', type: 'function' },
      { name: 'unloadNative', type: 'function' },
      { name: 'useEspack', type: 'function' }
    ],
    provenance: {
      package: packageInfo.name,
      repository: packageInfo.repository && packageInfo.repository.url,
      commit: gitHead(),
      artifact: 'dist/ESHASH.facade.jsx'
    }
  });
  const ownManifest = espackBuildApi.makeManifest({
    bundleName: 'eshash',
    cacheDir: '',
    payloads: [{ name: 'ESHASHNative', version: '1', len: payloadBytes.length,
      b64: payloadBytes.toString('base64'), fileName: 'ESHASHNative_v1.dll' }],
    libraries: [library],
    entries: [{ id: 'eshash', range: '=' + packageInfo.version }],
    capabilities: [{ id: 'eshash.native', provider: 'eshash', mode: 'optional',
      payloads: ['ESHASHNative'], accel: null }]
  });
  const composed = espackMergeApi.merge({
    manifests: [ESB64_MANIFEST, ownManifest],
    out: join(DIST, 'ESHASH.accel.jsx'),
    manifestOut,
    name: 'eshash',
    entries: [{ id: 'eshash', range: '=' + packageInfo.version }],
    deferB64: true
  });
  const accelOut = composed.text +
    '// ESHASH.accel.jsx - ESPACK v2 flattened ESB64 -> ESHASH composition with one loader/control plane\n';
  writeFileSync(join(DIST, 'ESHASH.accel.jsx'), accelOut, 'utf8');
  estcCheck('dist/ESHASH.facade.jsx');
  estcCheck('dist/ESHASH.accel.jsx');
  minifyAccel(accelOut);
  console.log('[eshash-build] wrote ESPACK accelerator, facade, manifest, and minified accelerator');
}

if (process.argv.includes('--accel')) await buildAccel();

console.log('[eshash-build] wrote dist/ESHASH.jsx and dist/eshash-core.esm.mjs');
