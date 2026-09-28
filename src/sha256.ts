/**
 * SHA-256 over byte strings or UTF-8 encoded text.
 *
 * This implements the FIPS 180-4 SHA-256 digest only. It is not an
 * authentication, password-hashing, or key-derivation API.
 */

export interface Sha256Hasher {
  updateBytes(bytes: string): Sha256Hasher;
  updateText(text: string): Sha256Hasher;
  digest(): string;
}

var SHA256_K: number[] = [
  0x428A2F98, 0x71374491, 0xB5C0FBCF, 0xE9B5DBA5,
  0x3956C25B, 0x59F111F1, 0x923F82A4, 0xAB1C5ED5,
  0xD807AA98, 0x12835B01, 0x243185BE, 0x550C7DC3,
  0x72BE5D74, 0x80DEB1FE, 0x9BDC06A7, 0xC19BF174,
  0xE49B69C1, 0xEFBE4786, 0x0FC19DC6, 0x240CA1CC,
  0x2DE92C6F, 0x4A7484AA, 0x5CB0A9DC, 0x76F988DA,
  0x983E5152, 0xA831C66D, 0xB00327C8, 0xBF597FC7,
  0xC6E00BF3, 0xD5A79147, 0x06CA6351, 0x14292967,
  0x27B70A85, 0x2E1B2138, 0x4D2C6DFC, 0x53380D13,
  0x650A7354, 0x766A0ABB, 0x81C2C92E, 0x92722C85,
  0xA2BFE8A1, 0xA81A664B, 0xC24B8B70, 0xC76C51A3,
  0xD192E819, 0xD6990624, 0xF40E3585, 0x106AA070,
  0x19A4C116, 0x1E376C08, 0x2748774C, 0x34B0BCB5,
  0x391C0CB3, 0x4ED8AA4A, 0x5B9CCA4F, 0x682E6FF3,
  0x748F82EE, 0x78A5636F, 0x84C87814, 0x8CC70208,
  0x90BEFFFA, 0xA4506CEB, 0xBEF9A3F7, 0xC67178F2
];

function rotateRight(word: number, count: number): number {
  var right = word >>> count;
  var left = word << (32 - count);
  var rotated = right | left;
  return rotated >>> 0;
}

function wordHex(word: number): string {
  var hex = (word >>> 0).toString(16);
  while (hex.length < 8) {
    hex = '0' + hex;
  }
  return hex;
}

export function createSha256(): Sha256Hasher {
  var state: number[] = [
    0x6A09E667, 0xBB67AE85, 0x3C6EF372, 0xA54FF53A,
    0x510E527F, 0x9B05688C, 0x1F83D9AB, 0x5BE0CD19
  ];
  var schedule: number[] = [];
  var i: number;
  for (i = 0; i < 64; i++) {
    schedule[i] = 0;
  }

  var block = '';
  var blockLength = 0;
  var byteCountLow = 0;
  var byteCountHigh = 0;
  var pendingHigh = -1;
  var failed = false;
  var finalized = false;
  var finalDigest = '';

  function ensureReadable(): void {
    if (failed) {
      throw new Error('ESHASH SHA-256 state is invalid after an update error');
    }
  }

  function ensureUpdatable(): void {
    ensureReadable();
    if (finalized) {
      throw new Error('ESHASH SHA-256 hasher is finalized');
    }
  }

  function compressBlock(input: string, offset: number): boolean {
    var wordIndex: number;
    var byte0: number;
    var byte1: number;
    var byte2: number;
    var byte3: number;
    var inputPosition: number;
    var shiftedByte0: number;
    var shiftedByte1: number;
    var shiftedByte2: number;
    var word: number;

    for (wordIndex = 0; wordIndex < 16; wordIndex++) {
      inputPosition = offset + (wordIndex * 4);
      byte0 = input.charCodeAt(inputPosition);
      byte1 = input.charCodeAt(inputPosition + 1);
      byte2 = input.charCodeAt(inputPosition + 2);
      byte3 = input.charCodeAt(inputPosition + 3);
      if (byte0 > 255 || byte1 > 255 || byte2 > 255 || byte3 > 255) {
        return false;
      }
      shiftedByte0 = byte0 << 24;
      shiftedByte1 = byte1 << 16;
      shiftedByte2 = byte2 << 8;
      word = shiftedByte0 | shiftedByte1;
      word = word | shiftedByte2;
      word = word | byte3;
      schedule[wordIndex] = word >>> 0;
    }

    var s0a: number;
    var s0b: number;
    var s0c: number;
    var s1a: number;
    var s1b: number;
    var s1c: number;
    var sigma0: number;
    var sigma1: number;

    for (wordIndex = 16; wordIndex < 64; wordIndex++) {
      word = schedule[wordIndex - 15];
      s0a = rotateRight(word, 7);
      s0b = rotateRight(word, 18);
      s0c = word >>> 3;
      sigma0 = s0a ^ s0b;
      sigma0 = sigma0 ^ s0c;

      word = schedule[wordIndex - 2];
      s1a = rotateRight(word, 17);
      s1b = rotateRight(word, 19);
      s1c = word >>> 10;
      sigma1 = s1a ^ s1b;
      sigma1 = sigma1 ^ s1c;

      schedule[wordIndex] = (
        schedule[wordIndex - 16] + sigma0 + schedule[wordIndex - 7] + sigma1
      ) >>> 0;
    }

    var a = state[0];
    var b = state[1];
    var c = state[2];
    var d = state[3];
    var e = state[4];
    var f = state[5];
    var g = state[6];
    var h = state[7];
    var big0: number;
    var big1: number;
    var chooseLeft: number;
    var chooseRight: number;
    var notE: number;
    var choose: number;
    var majority0: number;
    var majority1: number;
    var majority2: number;
    var majority: number;
    var temp1: number;
    var temp2: number;
    var round: number;

    for (round = 0; round < 64; round++) {
      s1a = rotateRight(e, 6);
      s1b = rotateRight(e, 11);
      s1c = rotateRight(e, 25);
      big1 = s1a ^ s1b;
      big1 = big1 ^ s1c;

      chooseLeft = e & f;
      notE = ~e;
      chooseRight = notE & g;
      choose = chooseLeft ^ chooseRight;
      temp1 = (h + big1 + choose + SHA256_K[round] + schedule[round]) >>> 0;

      s0a = rotateRight(a, 2);
      s0b = rotateRight(a, 13);
      s0c = rotateRight(a, 22);
      big0 = s0a ^ s0b;
      big0 = big0 ^ s0c;

      majority0 = a & b;
      majority1 = a & c;
      majority2 = b & c;
      majority = majority0 ^ majority1;
      majority = majority ^ majority2;
      temp2 = (big0 + majority) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    state[0] = (state[0] + a) >>> 0;
    state[1] = (state[1] + b) >>> 0;
    state[2] = (state[2] + c) >>> 0;
    state[3] = (state[3] + d) >>> 0;
    state[4] = (state[4] + e) >>> 0;
    state[5] = (state[5] + f) >>> 0;
    state[6] = (state[6] + g) >>> 0;
    state[7] = (state[7] + h) >>> 0;
    return true;
  }

  function appendByte(byteValue: number): void {
    block += String.fromCharCode(byteValue);
    blockLength++;
    if (blockLength === 64) {
      if (!compressBlock(block, 0)) {
        failed = true;
        throw new Error('ESHASH SHA-256 internal block is not byte-oriented');
      }
      block = '';
      blockLength = 0;
    }
  }

  function appendCodePoint(codePoint: number): number {
    var shifted: number;
    var masked: number;

    if (codePoint < 0x80) {
      appendByte(codePoint);
      return 1;
    }
    if (codePoint < 0x800) {
      shifted = codePoint >>> 6;
      appendByte(0xC0 | shifted);
      masked = codePoint & 0x3F;
      appendByte(0x80 | masked);
      return 2;
    }
    if (codePoint < 0x10000) {
      shifted = codePoint >>> 12;
      appendByte(0xE0 | shifted);
      shifted = codePoint >>> 6;
      masked = shifted & 0x3F;
      appendByte(0x80 | masked);
      masked = codePoint & 0x3F;
      appendByte(0x80 | masked);
      return 3;
    }
    shifted = codePoint >>> 18;
    appendByte(0xF0 | shifted);
    shifted = codePoint >>> 12;
    masked = shifted & 0x3F;
    appendByte(0x80 | masked);
    shifted = codePoint >>> 6;
    masked = shifted & 0x3F;
    appendByte(0x80 | masked);
    masked = codePoint & 0x3F;
    appendByte(0x80 | masked);
    return 4;
  }

  function addByteCount(count: number): void {
    if (count <= 0) {
      return;
    }
    var lowAdd = count >>> 0;
    var highAdd = Math.floor(count / 4294967296);
    var lowSum = byteCountLow + lowAdd;
    var carry = lowSum >= 4294967296 ? 1 : 0;
    var newHigh = byteCountHigh + highAdd + carry;
    if (newHigh >= 0x20000000) {
      failed = true;
      throw new RangeError('ESHASH SHA-256 input must be shorter than 2^64 bits');
    }
    byteCountLow = lowSum >>> 0;
    byteCountHigh = newHigh >>> 0;
  }

  function flushPendingHigh(): number {
    if (pendingHigh >= 0) {
      pendingHigh = -1;
      var count = appendCodePoint(0xFFFD);
      addByteCount(count);
      return count;
    }
    return 0;
  }

  function appendPaddingByte(byteValue: number): void {
    block += String.fromCharCode(byteValue);
    blockLength++;
    if (blockLength === 64) {
      if (!compressBlock(block, 0)) {
        failed = true;
        throw new Error('ESHASH SHA-256 internal padding block is invalid');
      }
      block = '';
      blockLength = 0;
    }
  }

  function finalize(): string {
    ensureReadable();
    if (finalized) {
      return finalDigest;
    }

    flushPendingHigh();
    var bitLowShifted = byteCountLow << 3;
    var bitLow = bitLowShifted >>> 0;
    var bitHighShifted = byteCountHigh << 3;
    var bitCarry = byteCountLow >>> 29;
    var bitHigh = bitHighShifted | bitCarry;
    bitHigh = bitHigh >>> 0;
    var lengthByte: number;

    appendPaddingByte(0x80);
    if (blockLength > 56) {
      while (blockLength > 0) {
        appendPaddingByte(0);
      }
    }
    while (blockLength < 56) {
      appendPaddingByte(0);
    }

    lengthByte = bitHigh >>> 24;
    lengthByte = lengthByte & 0xFF;
    appendPaddingByte(lengthByte);
    lengthByte = bitHigh >>> 16;
    lengthByte = lengthByte & 0xFF;
    appendPaddingByte(lengthByte);
    lengthByte = bitHigh >>> 8;
    lengthByte = lengthByte & 0xFF;
    appendPaddingByte(lengthByte);
    lengthByte = bitHigh & 0xFF;
    appendPaddingByte(lengthByte);
    lengthByte = bitLow >>> 24;
    lengthByte = lengthByte & 0xFF;
    appendPaddingByte(lengthByte);
    lengthByte = bitLow >>> 16;
    lengthByte = lengthByte & 0xFF;
    appendPaddingByte(lengthByte);
    lengthByte = bitLow >>> 8;
    lengthByte = lengthByte & 0xFF;
    appendPaddingByte(lengthByte);
    lengthByte = bitLow & 0xFF;
    appendPaddingByte(lengthByte);

    finalDigest = '';
    for (i = 0; i < 8; i++) {
      finalDigest += wordHex(state[i]);
    }
    finalized = true;
    return finalDigest;
  }

  var hasher: Sha256Hasher = {
    updateBytes: function (bytes: string): Sha256Hasher {
      ensureUpdatable();
      if (typeof bytes !== 'string') {
        throw new TypeError('ESHASH SHA-256 updateBytes expects a binary string');
      }

      flushPendingHigh();
      addByteCount(bytes.length);
      var offset = 0;
      var byteValue: number;
      var needed: number;
      var take: number;
      var j: number;

      if (blockLength > 0 && bytes.length > 0) {
        needed = 64 - blockLength;
        take = bytes.length < needed ? bytes.length : needed;
        for (j = 0; j < take; j++) {
          byteValue = bytes.charCodeAt(j);
          if (byteValue > 255) {
            failed = true;
            throw new RangeError('ESHASH SHA-256 byte strings require code units in 0..255');
          }
          block += String.fromCharCode(byteValue);
          blockLength++;
        }
        offset = take;
        if (blockLength === 64) {
          if (!compressBlock(block, 0)) {
            failed = true;
            throw new Error('ESHASH SHA-256 internal block is not byte-oriented');
          }
          block = '';
          blockLength = 0;
        }
      }

      while (offset + 64 <= bytes.length) {
        if (!compressBlock(bytes, offset)) {
          failed = true;
          throw new RangeError('ESHASH SHA-256 byte strings require code units in 0..255');
        }
        offset += 64;
      }

      if (offset < bytes.length) {
        block = '';
        blockLength = 0;
        for (j = offset; j < bytes.length; j++) {
          byteValue = bytes.charCodeAt(j);
          if (byteValue > 255) {
            failed = true;
            throw new RangeError('ESHASH SHA-256 byte strings require code units in 0..255');
          }
          block += String.fromCharCode(byteValue);
          blockLength++;
        }
      }
      return hasher;
    },

    updateText: function (text: string): Sha256Hasher {
      ensureUpdatable();
      if (typeof text !== 'string') {
        throw new TypeError('ESHASH SHA-256 updateText expects a string');
      }

      var i = 0;
      var codeUnit: number;
      var codePoint: number;
      var addedBytes = 0;

      if (pendingHigh >= 0) {
        if (text.length === 0) {
          return hasher;
        }
      }

      while (i < text.length) {
        codeUnit = text.charCodeAt(i);

        if (pendingHigh >= 0) {
          if (codeUnit >= 0xDC00 && codeUnit <= 0xDFFF) {
            codePoint = 0x10000 + ((pendingHigh - 0xD800) << 10) + (codeUnit - 0xDC00);
            addedBytes += appendCodePoint(codePoint);
            pendingHigh = -1;
            i++;
            continue;
          }
          addedBytes += appendCodePoint(0xFFFD);
          pendingHigh = -1;
        }

        if (codeUnit < 0x80) {
          block += String.fromCharCode(codeUnit);
          blockLength++;
          addedBytes++;
          if (blockLength === 64) {
            if (!compressBlock(block, 0)) {
              failed = true;
              throw new Error('ESHASH SHA-256 internal block is not byte-oriented');
            }
            block = '';
            blockLength = 0;
          }
          i++;
          continue;
        }

        if (codeUnit >= 0xD800 && codeUnit <= 0xDBFF) {
          pendingHigh = codeUnit;
          i++;
          continue;
        }

        if (codeUnit >= 0xDC00 && codeUnit <= 0xDFFF) {
          addedBytes += appendCodePoint(0xFFFD);
        } else {
          addedBytes += appendCodePoint(codeUnit);
        }
        i++;
      }

      addByteCount(addedBytes);
      return hasher;
    },

    digest: finalize
  };

  return hasher;
}

export function sha256Bytes(bytes: string): string {
  return createSha256().updateBytes(bytes).digest();
}

export function sha256Text(text: string): string {
  return createSha256().updateText(text).digest();
}
