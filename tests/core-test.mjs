import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  createCrc32,
  crc32Bytes,
  crc32Text,
  createSha256,
  sha256Bytes,
  sha256Text
} from '../dist/eshash-core.esm.mjs';

var checks = 0;
function equal(actual, expected, label) {
  assert.equal(actual, expected, label);
  checks++;
}
function throws(callback, expected, label) {
  assert.throws(callback, expected, label);
  checks++;
}

// FIPS 180-4 SHA-256 examples (6.3.1), plus the one-million-'a' example.
equal(sha256Bytes(''), 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', 'SHA-256 empty');
equal(sha256Text('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad', 'SHA-256 abc');
equal(
  sha256Text('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq'),
  '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1',
  'SHA-256 56-byte FIPS example'
);
equal(
  sha256Text(new Array(1000001).join('a')),
  'cdc76e5c9914fb9281a1c7e284d73e67f1809a48a497200e046d39ccc7112cd0',
  'SHA-256 one million a'
);

// CRC-32/ISO-HDLC check value (123456789) and standard empty-message result.
equal(crc32Bytes(''), 0x00000000, 'CRC-32 empty');
equal(createCrc32().hexDigest(), '00000000', 'CRC-32 empty hex');
equal(crc32Bytes('123456789'), 0xCBF43926, 'CRC-32 check value');
equal(createCrc32().updateBytes('123456789').hexDigest(), 'cbf43926', 'CRC-32 lowercase hex');
equal(crc32Text('The quick brown fox jumps over the lazy dog'), 0x414FA339, 'CRC-32 text vector');


// Explicit byte-string semantics: NUL and every Latin-1 byte are data.
var allBytes = '';
var i;
for (i = 0; i < 256; i++) {
  allBytes += String.fromCharCode(i);
}
equal(sha256Bytes(allBytes), createHash('sha256').update(Buffer.from(Array.from({ length: 256 }, function (_, n) { return n; }))).digest('hex'), 'SHA-256 bytes 0..255');
equal(crc32Bytes(allBytes), 0x29058C73, 'CRC-32 bytes 0..255');

equal(sha256Text('\u0000'), sha256Bytes('\u0000'), 'UTF-8 NUL is one zero byte');
equal(sha256Text('\u00e9'), createHash('sha256').update(Buffer.from('\u00e9', 'utf8')).digest('hex'), 'UTF-8 Latin-1 text');
equal(sha256Text('\ud83d\ude00'), createHash('sha256').update(Buffer.from('\ud83d\ude00', 'utf8')).digest('hex'), 'UTF-8 supplementary text');
equal(sha256Text('\ud800'), createHash('sha256').update(Buffer.from('\ud800', 'utf8')).digest('hex'), 'UTF-8 replacement for lone high surrogate');
equal(sha256Text('\udfff'), createHash('sha256').update(Buffer.from('\udfff', 'utf8')).digest('hex'), 'UTF-8 replacement for lone low surrogate');
equal(crc32Text('\ud800'), crc32Text('\ufffd'), 'CRC UTF-8 replacement for lone high surrogate');


// Stream boundaries: byte padding boundaries and a surrogate split across updates.
var lengths = [0, 1, 55, 56, 57, 63, 64, 65, 119, 120, 127, 128, 129];
for (i = 0; i < lengths.length; i++) {
  var raw = '';
  var j;
  for (j = 0; j < lengths[i]; j++) {
    raw += String.fromCharCode((j * 37 + lengths[i]) & 0xFF);
  }
  var expected = createHash('sha256').update(Buffer.from(raw, 'latin1')).digest('hex');
  equal(sha256Bytes(raw), expected, 'SHA direct length ' + lengths[i]);
  var streaming = createSha256();
  streaming.updateBytes(raw.substring(0, Math.floor(raw.length / 3)));
  streaming.updateBytes(raw.substring(Math.floor(raw.length / 3), Math.floor(raw.length * 2 / 3)));
  streaming.updateBytes(raw.substring(Math.floor(raw.length * 2 / 3)));
  equal(streaming.digest(), expected, 'SHA streaming length ' + lengths[i]);
  var crcStreaming = createCrc32();
  crcStreaming.updateBytes(raw.substring(0, Math.floor(raw.length / 2)));
  crcStreaming.updateBytes(raw.substring(Math.floor(raw.length / 2)));
  equal(crcStreaming.digest(), crc32Bytes(raw), 'CRC streaming length ' + lengths[i]);
}

var splitPairSha = createSha256();
splitPairSha.updateText('prefix\ud83d').updateText('\ude00suffix');
equal(splitPairSha.digest(), sha256Text('prefix\ud83d\ude00suffix'), 'SHA surrogate pair across updates');
var splitPairCrc = createCrc32();
splitPairCrc.updateText('prefix\ud83d').updateText('\ude00suffix');
equal(splitPairCrc.digest(), crc32Text('prefix\ud83d\ude00suffix'), 'CRC surrogate pair across updates');


var flushSha = createSha256();
flushSha.updateText('\ud800').updateBytes('x');
equal(flushSha.digest(), sha256Text('\ufffdx'), 'SHA pending surrogate flushed before bytes');
var flushCrc = createCrc32();
flushCrc.updateText('\ud800').updateBytes('x');
equal(flushCrc.digest(), crc32Text('\ufffdx'), 'CRC pending surrogate flushed before bytes');


var finalSha = createSha256();
finalSha.updateText('abc');
var finalDigest = finalSha.digest();
equal(finalSha.digest(), finalDigest, 'SHA digest is repeatable');
throws(function () { finalSha.updateText('x'); }, /finalized/, 'SHA rejects update after digest');
var finalCrc = createCrc32();
finalCrc.updateText('abc');
var finalCrcValue = finalCrc.digest();
equal(finalCrc.digest(), finalCrcValue, 'CRC digest is repeatable');
throws(function () { finalCrc.updateText('x'); }, /finalized/, 'CRC rejects update after digest');


var badSha = createSha256();
throws(function () { badSha.updateBytes('\u0100'); }, RangeError, 'SHA rejects non-byte code units');
throws(function () { badSha.digest(); }, /invalid after an update error/, 'SHA invalid state is sticky');
var badCrc = createCrc32();
throws(function () { badCrc.updateBytes('\u0100'); }, RangeError, 'CRC rejects non-byte code units');
throws(function () { badCrc.digest(); }, /invalid after an update error/, 'CRC invalid state is sticky');


console.log('[core-test] ' + checks + ' assertions passed');
