#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const manifest = JSON.parse(readFileSync(join(ROOT, 'dist', 'ESHASH.manifest.json'), 'utf8'));
const payload = manifest.payloads.find((item) => item.name === 'ESHASHNative');
const payloadBytes = readFileSync(join(ROOT, 'dist', 'native', 'release', 'ESHASHNative.dll'));
const esb64Manifest = JSON.parse(readFileSync(join(ROOT, '..', 'esb64', 'dist', 'ESB64.manifest.json'), 'utf8'));
const facadeBytes = readFileSync(join(ROOT, 'dist', 'ESHASH.facade.jsx'));
const facade = facadeBytes.toString('utf8');
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));

assert.equal(manifest.format, 'espack-manifest');
assert.equal(manifest.version, 2);
assert.equal(manifest.bundleName, 'eshash');
assert.equal(manifest.payloads.length, 1);
assert.equal(manifest.composer.name, 'espack');
assert.equal(manifest.composer.version, '0.5.0');
assert.equal(manifest.accel.name, esb64Manifest.accel.name);
assert.equal(manifest.accel.version, esb64Manifest.accel.version);
assert.deepEqual(Buffer.from(manifest.accel.b64, 'base64'), Buffer.from(esb64Manifest.accel.b64, 'base64'));
assert.ok(payload, 'ESHASHNative payload missing');
assert.equal(payload.version, '1');
assert.equal(payload.fileName, 'ESHASHNative_v1.dll');
assert.equal(payload.len, payloadBytes.length);
assert.deepEqual(Buffer.from(payload.b64, 'base64'), payloadBytes);
assert.equal(payload.sha256, createHash('sha256').update(payloadBytes).digest('hex'));

const accel = readFileSync(join(ROOT, 'dist', 'ESHASH.accel.jsx'), 'utf8');
const min = readFileSync(join(ROOT, 'dist', 'ESHASH.accel.min.jsx'), 'utf8');
assert.match(facade, /ESPAK\.load\("ESHASHNative"\)/);
assert.equal(manifest.libraries.map((library) => library.id).join(','), 'esb64,eshash', 'dependency closure is dependency-first');
const esb64 = manifest.libraries[0];
const eshash = manifest.libraries[1];
assert.equal(esb64.version, '1.3.0');
assert.equal(eshash.version, pkg.version);
assert.deepEqual(eshash.requires, [{ id: 'esb64', range: '^1.3.0', optional: false }]);
for (const library of manifest.libraries) {
  const bytes = Buffer.from(library.artifact.b64, 'base64');
  assert.equal(library.artifact.encoding, 'utf8-base64');
  assert.equal(library.artifact.len, bytes.length);
  assert.equal(library.artifact.sha256, createHash('sha256').update(bytes).digest('hex'));
  assert.deepEqual(Buffer.from(bytes.toString('utf8'), 'utf8'), bytes, 'artifact payload is valid UTF-8');
  assert.ok(library.provenance.package && library.provenance.repository && library.provenance.artifact);
}
assert.deepEqual(Buffer.from(esb64.artifact.b64, 'base64'), Buffer.from(esb64Manifest.libraries[0].artifact.b64, 'base64'));
assert.deepEqual(Buffer.from(eshash.artifact.b64, 'base64'), facadeBytes);
assert.equal(eshash.activation.global, 'ESHASH');
assert.equal(eshash.activation.type, 'object');
assert.ok(eshash.activation.contract.some((row) => row.name === 'sha256Bytes' && row.type === 'function'));
assert.deepEqual(manifest.capabilities.find((cap) => cap.id === 'eshash.native'), {
  id: 'eshash.native', provider: 'eshash', mode: 'optional', payloads: ['ESHASHNative'], accel: null
});
assert.ok(!accel.includes('vendor-esb64-runtime'), 'composition uses manifest library closure, not manually concatenated ESB64 runtime');
assert.ok(!accel.includes('.eshash-accel-bundle'), 'no nested legacy loader intermediate is shipped');
assert.equal((accel.match(/var ESPAK/g) || []).length, 1, 'root artifact contains one ESPAK control plane');
assert.ok(accel.indexOf('var __ESB64_ENTRY__=') < accel.indexOf('var __ESHASH_ENTRY__='), 'dependency facade evaluates before dependent facade');
assert.ok(min.length > 0);
assert.match(min, /ESB64/);
assert.match(min, /ESHASHNative/);
assert.match(min, /0\.5\.0/);

for (const artifact of [
  'dist/ESHASH.facade.jsx',
  'dist/ESHASH.accel.jsx',
  'dist/ESHASH.accel.min.jsx',
  'dist/ESHASH.manifest.json'
]) {
  assert.ok(pkg.files.includes(artifact), 'npm package whitelist missing ' + artifact);
}
const packagedDlls = pkg.files.filter((item) => /^dist\/native\/.*\.dll$/i.test(item));
assert.deepEqual(packagedDlls, ['dist/native/release/ESHASHNative.dll']);

console.log('[eshash-accel-contract] PASS payload=' + payloadBytes.length + ' accel=' + manifest.accel.len +
  ' bundle=' + Buffer.byteLength(accel) + ' min=' + Buffer.byteLength(min));
