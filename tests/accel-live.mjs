#!/usr/bin/env node
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createComToolRunner } from '../../extendscript-toolchain/src/comtool-compat.mjs';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const arg = process.argv.indexOf('--bundle');
const BUNDLE = arg >= 0 && process.argv[arg + 1] ? resolve(process.argv[arg + 1]) : join(ROOT, 'dist', 'ESHASH.accel.jsx');
if (!existsSync(BUNDLE)) throw new Error('accelerator bundle missing: ' + BUNDLE);
const PROBE_DIR = mkdtempSync(join(ROOT, 'tests', '.eshash-accel-live-'));
const PROBE = join(PROBE_DIR, 'probe.jsx');
const bundlePath = BUNDLE.replace(/\\/g, '/').replace(/"/g, '\\"');

writeFileSync(PROBE, [
  '#target illustrator',
  '(function () {',
  '  $.global["ESHASH"] = null;',
  '  $.global["ESPAK"] = null;',
  '  $.global["ESB64"] = null;',
  '  $.global["__ESPAK_LIBRARIES__"] = null;',
  '  $.evalFile(File("' + bundlePath + '"));',
  '  var H = $.global["ESHASH"];',
  '  var P = $.global["ESPAK"];',
  '  var out = { ok: false, checks: [] };',
  '  function check(name, value) { out.checks.push({ name: name, ok: value === true }); if (value !== true) throw new Error(name); }',
  '  try {',
  '    check("globals", !!H && !!P);',
  '    check("single ESPAK runtime", P.version === "0.5.0" && P.config.bundleName === "eshash");',
  '    check("ESB64 dependency activated transitively", !!$.global["ESB64"] && typeof $.global["ESB64"].atob === "function");',
  '    check("payload", P.config.payloads.length === 1 && P.config.payloads[0].name === "ESHASHNative");',
  '    check("shared accel", P.config.accel && P.config.accel.name === "ESB64Native" && P.config.accel.version === "2");',
  '    check("auto espack", H.espack && H.espack.ok === true);',
  '    var s = H.nativeStatus();',
  '    check("adopted", s.loaded === true && s.source === "espack" && s.owned === false && s.abiRevision === 1);',
  '    check("route sha", s.routes.sha256 === true);',
  '    check("route crc conservative", s.routes.crc32 === false);',
  '    check("sha parity", H.sha256Bytes("abc") === "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");',
  '    check("crc parity", H.crc32Bytes("abc") === 891568578);',
  '    var before = P.load("ESHASHNative");',
  '    check("detach", H.unloadNative() === true && H.nativeStatus().loaded === false);',
  '    var after = P.load("ESHASHNative");',
  '    check("espak owns lib", before.ok && after.ok && before.lib === after.lib);',
  '    check("readopt", H.useEspack().ok === true && H.nativeStatus().source === "espack");',
  '    check("crc explicit opt-in", H.useEspack({ crc32: true }).ok === true && H.nativeStatus().routes.crc32 === true && H.crc32Bytes("abc") === 891568578);',
  '    out.mode = P.mode(); out.status = H.nativeStatus(); out.ok = true;',
  '  } catch (error) { out.error = String(error); }',
  '  try { if (H) H.unloadNative(); } catch (ignoreUnload) {}',
  '  return out.toSource();',
  '}());'
].join('\n'), 'utf8');

const COM = createComToolRunner();
try {
  const result = await COM.run(['eval', '--file', PROBE], { timeoutMs: 180000 });
  if (!result.ok) throw new Error(JSON.stringify(result.error || result));
  const text = String(result.result);
  assert.match(text, /ok:true/);
  assert.doesNotMatch(text, /ok:false/);
  console.log('[eshash-accel-live] PASS ' + BUNDLE + ' ' + text);
} finally {
  await COM.close().catch(() => {});
  rmSync(PROBE_DIR, { recursive: true, force: true });
}