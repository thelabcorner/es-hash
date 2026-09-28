import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createCrc32, crc32Bytes, crc32Text, createSha256, sha256Bytes, sha256Text } from '../dist/eshash-core.esm.mjs';

var seed = 0x5EED1234;
var byteCases = 2048;
var textCases = 2048;
var checks = 0;

function random32() {
  seed ^= seed << 13;
  seed ^= seed >>> 17;
  seed ^= seed << 5;
  return seed >>> 0;
}

function referenceCrc(buffer) {
  var crc = 0xFFFFFFFF;
  var i;
  var bit;
  var value;
  var shifted;
  for (i = 0; i < buffer.length; i++) {
    crc = crc ^ buffer[i];
    for (bit = 0; bit < 8; bit++) {
      if ((crc & 1) !== 0) {
        shifted = crc >>> 1;
        crc = shifted ^ 0xEDB88320;
      } else {
        crc = crc >>> 1;
      }
    }
  }
  value = crc ^ 0xFFFFFFFF;
  return value >>> 0;
}

function checkBytes(buffer, label) {
  var binary = buffer.toString('latin1');
  var expectedSha = createHash('sha256').update(buffer).digest('hex');
  var expectedCrc = referenceCrc(buffer);
  assert.equal(sha256Bytes(binary), expectedSha, label + ' SHA direct');
  checks++;
  assert.equal(crc32Bytes(binary), expectedCrc, label + ' CRC direct');
  checks++;

  var splitSha = createSha256();
  var splitCrc = createCrc32();
  var offset = 0;
  while (offset < binary.length) {
    var width = 1 + (random32() % 97);
    var end = Math.min(binary.length, offset + width);
    var piece = binary.substring(offset, end);
    splitSha.updateBytes(piece);
    splitCrc.updateBytes(piece);
    offset = end;
  }
  assert.equal(splitSha.digest(), expectedSha, label + ' SHA streaming');
  checks++;
  assert.equal(splitCrc.digest(), expectedCrc, label + ' CRC streaming');
  checks++;
}

function checkText(text, label) {
  var utf8 = Buffer.from(text, 'utf8');
  var expectedSha = createHash('sha256').update(utf8).digest('hex');
  var expectedCrc = referenceCrc(utf8);
  assert.equal(sha256Text(text), expectedSha, label + ' SHA text');
  checks++;
  assert.equal(crc32Text(text), expectedCrc, label + ' CRC text');
  checks++;

  var splitSha = createSha256();
  var splitCrc = createCrc32();
  var offset = 0;
  while (offset < text.length) {
    var width = 1 + (random32() % 11);
    var end = Math.min(text.length, offset + width);
    var piece = text.substring(offset, end);
    splitSha.updateText(piece);
    splitCrc.updateText(piece);
    offset = end;
  }
  assert.equal(splitSha.digest(), expectedSha, label + ' SHA text streaming');
  checks++;
  assert.equal(splitCrc.digest(), expectedCrc, label + ' CRC text streaming');
  checks++;
}

var i;
for (i = 0; i < byteCases; i++) {
  var byteLength = random32() % 2049;
  var bytes = Buffer.allocUnsafe(byteLength);
  var j;
  for (j = 0; j < byteLength; j++) {
    bytes[j] = random32() & 0xFF;
  }
  checkBytes(bytes, 'seed=0x5EED1234 bytes case=' + i);
}

var unitPool = [
  0x0000, 0x0001, 0x007F, 0x0080, 0x07FF, 0x0800, 0xD7FF,
  0xD800, 0xDBFF, 0xDC00, 0xDFFF, 0xE000, 0xFEFF, 0xFFFF
];
for (i = 0; i < textCases; i++) {
  var unitLength = random32() % 193;
  var text = '';
  var k;
  for (k = 0; k < unitLength; k++) {
    var selector = random32() % 5;
    var unit = selector === 0 ? unitPool[random32() % unitPool.length] : random32() & 0xFFFF;
    text += String.fromCharCode(unit);
  }
  checkText(text, 'seed=0x5EED1234 text case=' + i);
}

// Practical-size regression: compares 256 KiB without creating one array entry per byte.
var large = Buffer.allocUnsafe(256 * 1024);
for (i = 0; i < large.length; i++) {
  large[i] = (i * 131 + (i >>> 7) + 17) & 0xFF;
}
checkBytes(large, '256KiB deterministic payload');

console.log('[differential] ' + checks + ' checks passed; seed=0x5EED1234; byteCases=' + byteCases + '; textCases=' + textCases + '; extra=256KiB');
