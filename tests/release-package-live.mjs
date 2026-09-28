#!/usr/bin/env node
import assert from 'node:assert/strict';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createComToolRunner } from '../../extendscript-toolchain/src/comtool-compat.mjs';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const stage = mkdtempSync(join(tmpdir(), 'eshash-release-live-'));
const nativeDir = join(stage, 'native', 'release');
mkdirSync(nativeDir, { recursive: true });
copyFileSync(join(ROOT, 'dist', 'ESHASH.jsx'), join(stage, 'ESHASH.jsx'));
copyFileSync(join(ROOT, 'dist', 'native', 'release', 'ESHASHNative.dll'), join(nativeDir, 'ESHASHNative.dll'));

const jsx = join(stage, 'ESHASH.jsx').replace(/\\/g, '/');
const probe = join(stage, 'probe.jsx');
writeFileSync(probe, [
  '#target illustrator',
  '(function () {',
  '  $.evalFile(File(' + JSON.stringify(jsx) + '));',
  '  var releaseLoaded = ESHASH.loadNative();',
  '  var releaseStatus = ESHASH.nativeStatus();',
  '  var releaseSha = ESHASH.sha256Bytes("abc");',
  '  var ok = releaseLoaded && releaseStatus.abiRevision === 1 && releaseSha === "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";',
  '  ESHASH.unloadNative();',
  '  return ({ok:ok,status:releaseStatus,sha:releaseSha}).toSource();',
  '}());'
].join('\n'), 'utf8');

const COM = createComToolRunner();
try {
  const result = await COM.run(['eval', '--file', probe], { timeoutMs: 120000 });
  if (!result.ok) throw new Error(JSON.stringify(result.error || result));
  const text = String(result.result);
  assert.match(text, /ok:true/);
  assert.match(text, /abiRevision:1/);
  assert.match(text, /native\\\\release\\\\ESHASHNative\.dll|native\/release\/ESHASHNative\.dll/);
  console.log('[eshash-release-package-live] PASS ' + text);
} finally {
  await COM.close().catch(() => {});
  try {
    rmSync(stage, { recursive: true, force: true });
  } catch (error) {
    if (!error || error.code !== 'EPERM') throw error;
    console.log('[eshash-release-package-live] cleanup deferred: Illustrator still holds the unloaded DLL mapping at ' + stage);
  }
}
