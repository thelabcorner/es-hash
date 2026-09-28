#!/usr/bin/env node
import assert from 'node:assert/strict';
import { writeFileSync, rmSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { createComToolRunner } from '../../extendscript-toolchain/src/comtool-compat.mjs';

var ROOT = dirname(fileURLToPath(import.meta.url));
var PROJECT = dirname(ROOT);
var DLL = process.env.ESHASH_NATIVE_DLL ||
  join(PROJECT, 'dist', 'native', readFileSync(join(PROJECT, 'dist', 'native', 'ESHASHNative.current'), 'utf8'));
DLL = DLL.replace(/\\/g, '/');
var JSX = join(PROJECT, 'dist', 'ESHASH.jsx').replace(/\\/g, '/');
var probePath = join(ROOT, '.eshash-native-bench-' + process.pid + '-' + Date.now() + '.jsx');
var COM = createComToolRunner();
var payload = '';
for (var i = 0; i < 4096; i++) payload += String.fromCharCode((i * 131 + 17) & 255);
var expectedSha = createHash('sha256').update(Buffer.from(payload, 'latin1')).digest('hex');
var expectedCrc = 0xFFFFFFFF;
for (var byteIndex = 0; byteIndex < payload.length; byteIndex++) {
  expectedCrc ^= payload.charCodeAt(byteIndex);
  for (var bitIndex = 0; bitIndex < 8; bitIndex++) expectedCrc = (expectedCrc >>> 1) ^ ((expectedCrc & 1) ? 0xEDB88320 : 0);
}
expectedCrc = (expectedCrc ^ 0xFFFFFFFF) >>> 0;

function median(values) {
  var sorted = values.slice(0).sort(function (a, b) { return a - b; });
  return sorted[Math.floor(sorted.length / 2)];
}

var probe = [
  '#target illustrator',
  '$.evalFile(File(' + JSON.stringify(JSX) + '));',
  'var api=$.global["ESHASH"];',
  'if(!api.loadNative(' + JSON.stringify(DLL) + ')) throw new Error("native load failed: "+api.nativeStatus().error);',
  'var payload=' + JSON.stringify(payload) + ';',
  'var expected=' + JSON.stringify(expectedSha) + ';',
  'var expectedCrc=' + expectedCrc + ';',
  'var shaNative=[],shaJsx=[],crcNative=[],crcJsx=[],i,start,result;',
  'function time(fn){$.hiresTimer;$.hiresTimer;start=$.hiresTimer;result=fn();return {us:$.hiresTimer,value:result};}',
  'if(api.sha256Bytes(payload)!==expected||api.createSha256().updateBytes(payload).digest()!==expected)throw new Error("SHA preflight parity failed");if(api.crc32Bytes(payload)!==expectedCrc||api.createCrc32().updateBytes(payload).digest()!==expectedCrc)throw new Error("CRC preflight parity failed");',
  'for(i=0;i<2;i++){api.sha256Bytes(payload);api.crc32Bytes(payload);api.createSha256().updateBytes(payload).digest();api.createCrc32().updateBytes(payload).digest();}',
  'for(i=0;i<7;i++){var n=time(function(){return api.sha256Bytes(payload);});if(n.value!==expected)throw new Error("native SHA parity failed");shaNative.push(n.us);var j=time(function(){return api.createSha256().updateBytes(payload).digest();});if(j.value!==expected)throw new Error("JSX SHA parity failed");shaJsx.push(j.us);var cn=time(function(){return api.crc32Bytes(payload);});var cj=time(function(){return api.createCrc32().updateBytes(payload).digest();});if(cn.value!==expectedCrc||cj.value!==expectedCrc)throw new Error("CRC parity failed");crcNative.push(cn.us);crcJsx.push(cj.us);}',
  'var nativePath=api.nativeStatus().path;api.unloadNative();({engine:$.version,bytes:payload.length,nativePath:nativePath,shaNative:shaNative,shaJsx:shaJsx,crcNative:crcNative,crcJsx:crcJsx});'
].join('\n');

try {
  writeFileSync(probePath, probe, 'utf8');
  var envelope = JSON.parse(await COM.runText(['eval', '--file', probePath], { timeoutMs: 120000 }));
  if (!envelope.ok) throw new Error(JSON.stringify(envelope.error || envelope));
  var report = envelope.result && envelope.result.result ? envelope.result.result : envelope.result;
  assert.equal(report.bytes, payload.length);
  for (var lane of ['shaNative', 'shaJsx', 'crcNative', 'crcJsx']) {
    console.log('[benchmark-native-live] ' + lane + ' median=' + median(report[lane]).toFixed(2) + ' us samples=' + report[lane].join(','));
  }
  console.log('[benchmark-native-live] Illustrator ' + report.engine + ', bytes=' + report.bytes + ', native=' + report.nativePath + '; timings include temp-file BINARY write/read and ExternalObject call for native lanes.');
} catch (error) {
  console.error('[benchmark-native-live] ' + String(error && error.message ? error.message : error));
  process.exitCode = 1;
} finally {
  rmSync(probePath, { force: true });
  await COM.close().catch(function () {});
}
