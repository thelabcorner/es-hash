#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { hrtime } from 'node:process';
import { crc32Bytes, sha256Bytes } from '../dist/eshash-core.esm.mjs';
import {
  DIGEST_SOURCE,
  make16WordCompressor,
  make64WordCompressor,
  makeScalarCompressor,
  scalarCompressorSource,
  sourceForLayout
} from './sha-layouts.mjs';

var SAMPLE_COUNT = 7;
var layouts = [
  { name: 'A:64-word', factory: make64WordCompressor },
  { name: 'B:16-ring', factory: make16WordCompressor },
  { name: 'C:scalar-unrolled', factory: makeScalarCompressor }
];
var workloadSpecs = [
  { name: '1 block', bytes: 64, batch: 100, warmups: 100 },
  { name: '16 blocks', bytes: 1024, batch: 10, warmups: 50 },
  { name: '1 KiB', bytes: 1024, batch: 10, warmups: 50 },
  { name: '64 KiB', bytes: 64 * 1024, batch: 1, warmups: 5 },
  { name: '256 KiB', bytes: 256 * 1024, batch: 1, warmups: 2 }
];

function nowNs() {
  return hrtime.bigint();
}

function usSince(start) {
  return Number(hrtime.bigint() - start) / 1000;
}

function median(values) {
  var sorted = values.slice(0).sort(function (a, b) { return a - b; });
  var middle = Math.floor(sorted.length / 2);
  if ((sorted.length % 2) === 1) {
    return sorted[middle];
  }
  return (sorted[middle - 1] + sorted[middle]) / 2;
}

function range(values) {
  var minimum = values[0];
  var maximum = values[0];
  var i;
  for (i = 1; i < values.length; i++) {
    if (values[i] < minimum) minimum = values[i];
    if (values[i] > maximum) maximum = values[i];
  }
  return { min: minimum, max: maximum };
}

function makeBinary(length) {
  var piece = '';
  var i;
  for (i = 0; i < 64; i++) {
    piece += String.fromCharCode((i * 131 + 17) & 0xFF);
  }
  var input = '';
  while (input.length < length) {
    input += piece;
  }
  return input.substring(0, length);
}

function measureHash(factory, input, batch) {
  var i;
  var result = '';
  var start = nowNs();
  for (i = 0; i < batch; i++) {
    result = DIGEST_SOURCE(input, factory);
  }
  return { us: usSince(start) / batch, result: result };
}

var shaRows = [];
for (var l = 0; l < layouts.length; l++) {
  var layout = layouts[l];
  var sourceBytes = Buffer.byteLength(sourceForLayout(layout.name.substring(0, 1)), 'utf8');
  var first64 = measureHash(layout.factory, makeBinary(64), 1);
  var layoutSizes = [];

  for (var w = 0; w < workloadSpecs.length; w++) {
    var spec = workloadSpecs[w];
    var input = makeBinary(spec.bytes);
    var expected = createHash('sha256').update(Buffer.from(input, 'latin1')).digest('hex');
    assert.equal(DIGEST_SOURCE(input, layout.factory), expected, layout.name + ' ' + spec.name + ' oracle');
    assert.equal(DIGEST_SOURCE(input, layout.factory), sha256Bytes(input), layout.name + ' ' + spec.name + ' production parity');

    for (var warmup = 0; warmup < spec.warmups; warmup++) {
      measureHash(layout.factory, input, spec.batch);
    }
    var samples = [];
    for (var sample = 0; sample < SAMPLE_COUNT; sample++) {
      samples.push(measureHash(layout.factory, input, spec.batch).us);
    }
    var spread = range(samples);
    var row = {
      layout: layout.name,
      workload: spec.name,
      bytes: spec.bytes,
      medianUs: median(samples),
      minUs: spread.min,
      maxUs: spread.max,
      cold64Us: first64.us,
      generatedKernelBytes: sourceBytes
    };
    layoutSizes.push(row);
  }
  shaRows = shaRows.concat(layoutSizes);
}

function generateCrcTable() {
  var table = [];
  var i;
  var bit;
  var value;
  var shifted;
  for (i = 0; i < 256; i++) {
    value = i;
    for (bit = 0; bit < 8; bit++) {
      if ((value & 1) !== 0) {
        shifted = value >>> 1;
        value = shifted ^ 0xEDB88320;
      } else {
        value = value >>> 1;
      }
    }
    table[i] = value >>> 0;
  }
  return table;
}

function crcWithTable(input, table) {
  var crc = 0xFFFFFFFF;
  var i;
  var xorValue;
  var index;
  var shiftedCrc;
  var combined;
  for (i = 0; i < input.length; i++) {
    xorValue = crc ^ input.charCodeAt(i);
    index = xorValue & 0xFF;
    shiftedCrc = crc >>> 8;
    combined = table[index] ^ shiftedCrc;
    crc = combined >>> 0;
  }
  var inverted = crc ^ 0xFFFFFFFF;
  return inverted >>> 0;
}

var crcTable = generateCrcTable();
var literalSource = 'var CRC_LITERAL = [' + crcTable.join(',') + '];';
var literalBytes = Buffer.byteLength(literalSource, 'utf8');
var tableInitRuns = 11;
var generatedInitSamples = [];
var literalInitSamples = [];
for (var initRun = 0; initRun < tableInitRuns; initRun++) {
  var generatedStart = nowNs();
  var generatedTable = generateCrcTable();
  generatedInitSamples.push(usSince(generatedStart));
  assert.equal(generatedTable[255], crcTable[255]);

  var literalStart = nowNs();
  var literalFactory = new Function(literalSource + '\nreturn CRC_LITERAL;');
  var literalTable = literalFactory();
  literalInitSamples.push(usSince(literalStart));
  assert.equal(literalTable[255], crcTable[255]);
}

var crcInput = makeBinary(256 * 1024);
assert.equal(crcWithTable(crcInput, crcTable), crc32Bytes(crcInput), 'runtime-table CRC parity');
var literalTableCheck = new Function(literalSource + '\nreturn CRC_LITERAL;')();
assert.equal(crcWithTable(crcInput, literalTableCheck), crc32Bytes(crcInput), 'literal-table CRC parity');

function measureCrc(input, table) {
  var start = nowNs();
  var result = crcWithTable(input, table);
  return { us: usSince(start), result: result };
}

var generatedScanSamples = [];
var literalScanSamples = [];
for (var scanRun = 0; scanRun < SAMPLE_COUNT; scanRun++) {
  generatedScanSamples.push(measureCrc(crcInput, crcTable).us);
  literalScanSamples.push(measureCrc(crcInput, literalTableCheck).us);
}

console.log('ESHASH Node layout benchmark; timer=process.hrtime.bigint; samples=' + SAMPLE_COUNT + '; warmups=100/50/50/5/2 by workload; first-use=one pre-warm 64-byte digest.');
console.log('SHA kernel-source bytes count shared digest+constants+kernel; cold64 includes first call/JIT and schedule setup.');
console.log('| layout | workload | bytes | median us/digest | min..max us | cold64 us | kernel bytes |');
console.log('|---|---:|---:|---:|---:|---:|---:|');
for (var r = 0; r < shaRows.length; r++) {
  var row = shaRows[r];
  console.log('| ' + row.layout + ' | ' + row.workload + ' | ' + row.bytes + ' | ' + row.medianUs.toFixed(2) + ' | ' + row.minUs.toFixed(2) + '..' + row.maxUs.toFixed(2) + ' | ' + row.cold64Us.toFixed(2) + ' | ' + row.generatedKernelBytes + ' |');
}
console.log('CRC 256-entry table: generated init median=' + median(generatedInitSamples).toFixed(2) + ' us; precomputed literal parse+array median=' + median(literalInitSamples).toFixed(2) + ' us; literal source=' + literalBytes + ' bytes; generated function=' + Buffer.byteLength(generateCrcTable.toString(), 'utf8') + ' bytes.');
console.log('CRC 256KiB scan: generated-table median=' + median(generatedScanSamples).toFixed(2) + ' us; literal-table median=' + median(literalScanSamples).toFixed(2) + ' us; both outputs match production.');
