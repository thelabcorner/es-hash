export var K = [
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

export function rotateRight(word, count) {
  var right = word >>> count;
  var left = word << (32 - count);
  var rotated = right | left;
  return rotated >>> 0;
}

export function make64WordCompressor() {
  var schedule = [];
  var i;
  for (i = 0; i < 64; i++) {
    schedule[i] = 0;
  }

  return function compress(input, offset, state) {
    var wordIndex;
    var inputPosition;
    var byte0;
    var byte1;
    var byte2;
    var byte3;
    var shiftedByte0;
    var shiftedByte1;
    var shiftedByte2;
    var word;
    for (wordIndex = 0; wordIndex < 16; wordIndex++) {
      inputPosition = offset + wordIndex * 4;
      byte0 = input.charCodeAt(inputPosition);
      byte1 = input.charCodeAt(inputPosition + 1);
      byte2 = input.charCodeAt(inputPosition + 2);
      byte3 = input.charCodeAt(inputPosition + 3);
      shiftedByte0 = byte0 << 24;
      shiftedByte1 = byte1 << 16;
      shiftedByte2 = byte2 << 8;
      word = shiftedByte0 | shiftedByte1;
      word = word | shiftedByte2;
      word = word | byte3;
      schedule[wordIndex] = word >>> 0;
    }

    var s0a;
    var s0b;
    var s0c;
    var s1a;
    var s1b;
    var s1c;
    var sigma0;
    var sigma1;
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
    var big0;
    var big1;
    var chooseLeft;
    var chooseRight;
    var notE;
    var choose;
    var majority0;
    var majority1;
    var majority2;
    var majority;
    var temp1;
    var temp2;
    var round;
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
      temp1 = (h + big1 + choose + K[round] + schedule[round]) >>> 0;
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
  };
}

export function make16WordCompressor() {
  var schedule = [];
  var i;
  for (i = 0; i < 16; i++) {
    schedule[i] = 0;
  }

  return function compress(input, offset, state) {
    var wordIndex;
    var inputPosition;
    var byte0;
    var byte1;
    var byte2;
    var byte3;
    var shiftedByte0;
    var shiftedByte1;
    var shiftedByte2;
    var word;
    for (wordIndex = 0; wordIndex < 16; wordIndex++) {
      inputPosition = offset + wordIndex * 4;
      byte0 = input.charCodeAt(inputPosition);
      byte1 = input.charCodeAt(inputPosition + 1);
      byte2 = input.charCodeAt(inputPosition + 2);
      byte3 = input.charCodeAt(inputPosition + 3);
      shiftedByte0 = byte0 << 24;
      shiftedByte1 = byte1 << 16;
      shiftedByte2 = byte2 << 8;
      word = shiftedByte0 | shiftedByte1;
      word = word | shiftedByte2;
      word = word | byte3;
      schedule[wordIndex] = word >>> 0;
    }

    var s0a;
    var s0b;
    var s0c;
    var s1a;
    var s1b;
    var s1c;
    var sigma0;
    var sigma1;
    var index0;
    var index1;
    var index2;
    var slot;
    var sum;
    var a = state[0];
    var b = state[1];
    var c = state[2];
    var d = state[3];
    var e = state[4];
    var f = state[5];
    var g = state[6];
    var h = state[7];
    var big0;
    var big1;
    var chooseLeft;
    var chooseRight;
    var notE;
    var choose;
    var majority0;
    var majority1;
    var majority2;
    var majority;
    var temp1;
    var temp2;
    var round;
    var scheduleWord;

    for (round = 0; round < 64; round++) {
      slot = round & 15;
      if (round >= 16) {
        index0 = (round - 15) & 15;
        word = schedule[index0];
        s0a = rotateRight(word, 7);
        s0b = rotateRight(word, 18);
        s0c = word >>> 3;
        sigma0 = s0a ^ s0b;
        sigma0 = sigma0 ^ s0c;
        index1 = (round - 2) & 15;
        word = schedule[index1];
        s1a = rotateRight(word, 17);
        s1b = rotateRight(word, 19);
        s1c = word >>> 10;
        sigma1 = s1a ^ s1b;
        sigma1 = sigma1 ^ s1c;
        index2 = (round - 7) & 15;
        sum = schedule[slot] + sigma0 + schedule[index2] + sigma1;
        scheduleWord = sum >>> 0;
        schedule[slot] = scheduleWord;
      }

      word = schedule[slot];
      s1a = rotateRight(e, 6);
      s1b = rotateRight(e, 11);
      s1c = rotateRight(e, 25);
      big1 = s1a ^ s1b;
      big1 = big1 ^ s1c;
      chooseLeft = e & f;
      notE = ~e;
      chooseRight = notE & g;
      choose = chooseLeft ^ chooseRight;
      temp1 = (h + big1 + choose + K[round] + word) >>> 0;
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
  };
}

export function scalarCompressorSource() {
  var lines = [];
  var wordNames = [];
  var i;
  var t;
  for (i = 0; i < 16; i++) {
    wordNames[i] = 'W' + i;
  }
  lines.push('function makeScalarCompressor() {');
  lines.push('return function compress(input, offset, state) {');
  lines.push('var inputPosition, byte0, byte1, byte2, byte3, shiftedByte0, shiftedByte1, shiftedByte2, word;');
  lines.push('var r0, l0, r1, l1, r2, l2, rr0, rr1, rr2, sigma0, sigma1, scheduleWord;');
  lines.push('var a = state[0], b = state[1], c = state[2], d = state[3], e = state[4], f = state[5], g = state[6], h = state[7];');
  lines.push('var big0, big1, chooseLeft, notE, chooseRight, choose, majority0, majority1, majority2, majority, temp1, temp2;');
  lines.push('var s0a, s0b, s0c, s1a, s1b, s1c;');
  lines.push('var ' + wordNames.join(', ') + ';');

  for (i = 0; i < 16; i++) {
    lines.push('inputPosition = offset + ' + (i * 4) + ';');
    lines.push('byte0 = input.charCodeAt(inputPosition);');
    lines.push('byte1 = input.charCodeAt(inputPosition + 1);');
    lines.push('byte2 = input.charCodeAt(inputPosition + 2);');
    lines.push('byte3 = input.charCodeAt(inputPosition + 3);');
    lines.push('shiftedByte0 = byte0 << 24;');
    lines.push('shiftedByte1 = byte1 << 16;');
    lines.push('shiftedByte2 = byte2 << 8;');
    lines.push('word = shiftedByte0 | shiftedByte1;');
    lines.push('word = word | shiftedByte2;');
    lines.push('word = word | byte3;');
    lines.push(wordNames[i] + ' = word >>> 0;');
  }

  for (t = 0; t < 64; t++) {
    if (t >= 16) {
      var slot = t & 15;
      var idx15 = (t - 15) & 15;
      var idx2 = (t - 2) & 15;
      var idx7 = (t - 7) & 15;
      lines.push('word = ' + wordNames[idx15] + ';');
      lines.push('r0 = word >>> 7; l0 = word << 25; rr0 = r0 | l0;');
      lines.push('r1 = word >>> 18; l1 = word << 14; rr1 = r1 | l1;');
      lines.push('r2 = word >>> 3; sigma0 = rr0 ^ rr1; sigma0 = sigma0 ^ r2;');
      lines.push('word = ' + wordNames[idx2] + ';');
      lines.push('r0 = word >>> 17; l0 = word << 15; rr0 = r0 | l0;');
      lines.push('r1 = word >>> 19; l1 = word << 13; rr1 = r1 | l1;');
      lines.push('r2 = word >>> 10; sigma1 = rr0 ^ rr1; sigma1 = sigma1 ^ r2;');
      lines.push('scheduleWord = (' + wordNames[slot] + ' + sigma0 + ' + wordNames[idx7] + ' + sigma1) >>> 0;');
      lines.push(wordNames[slot] + ' = scheduleWord;');
    }

    lines.push('s1a = e >>> 6; s1b = e << 26; s1a = s1a | s1b;');
    lines.push('s1b = e >>> 11; s1c = e << 21; s1b = s1b | s1c;');
    lines.push('s1c = e >>> 25; s0a = e << 7; s1c = s1c | s0a;');
    lines.push('big1 = s1a ^ s1b; big1 = big1 ^ s1c;');
    lines.push('chooseLeft = e & f; notE = ~e; chooseRight = notE & g; choose = chooseLeft ^ chooseRight;');
    lines.push('temp1 = (h + big1 + choose + 0x' + K[t].toString(16).toUpperCase() + ' + ' + wordNames[t & 15] + ') >>> 0;');
    lines.push('s0a = a >>> 2; s0b = a << 30; s0a = s0a | s0b;');
    lines.push('s0b = a >>> 13; s0c = a << 19; s0b = s0b | s0c;');
    lines.push('s0c = a >>> 22; s1a = a << 10; s0c = s0c | s1a;');
    lines.push('big0 = s0a ^ s0b; big0 = big0 ^ s0c;');
    lines.push('majority0 = a & b; majority1 = a & c; majority2 = b & c;');
    lines.push('majority = majority0 ^ majority1; majority = majority ^ majority2;');
    lines.push('temp2 = (big0 + majority) >>> 0;');
    lines.push('h = g; g = f; f = e; e = (d + temp1) >>> 0; d = c; c = b; b = a; a = (temp1 + temp2) >>> 0;');
  }

  lines.push('state[0] = (state[0] + a) >>> 0;');
  lines.push('state[1] = (state[1] + b) >>> 0;');
  lines.push('state[2] = (state[2] + c) >>> 0;');
  lines.push('state[3] = (state[3] + d) >>> 0;');
  lines.push('state[4] = (state[4] + e) >>> 0;');
  lines.push('state[5] = (state[5] + f) >>> 0;');
  lines.push('state[6] = (state[6] + g) >>> 0;');
  lines.push('state[7] = (state[7] + h) >>> 0;');
  lines.push('return true;');
  lines.push('};');
  lines.push('}');
  return lines.join('\n');
}

var SCALAR_FACTORY = new Function(
  scalarCompressorSource() + '\nreturn makeScalarCompressor;'
)();

export var DIGEST_SOURCE = function digestBinary(input, makeCompressor) {
  var state = [
    0x6A09E667, 0xBB67AE85, 0x3C6EF372, 0xA54FF53A,
    0x510E527F, 0x9B05688C, 0x1F83D9AB, 0x5BE0CD19
  ];
  var compress = makeCompressor();
  var offset = 0;
  var fullLength = input.length;
  while (offset + 64 <= fullLength) {
    compress(input, offset, state);
    offset += 64;
  }

  var tail = input.substring(offset) + String.fromCharCode(0x80);
  while ((tail.length % 64) !== 56) {
    tail += String.fromCharCode(0);
  }
  var bitLength = fullLength * 8;
  var bitHigh = Math.floor(bitLength / 4294967296);
  var bitLow = bitLength - bitHigh * 4294967296;
  tail += String.fromCharCode(
    Math.floor(bitHigh / 16777216) % 256,
    Math.floor(bitHigh / 65536) % 256,
    Math.floor(bitHigh / 256) % 256,
    bitHigh % 256,
    Math.floor(bitLow / 16777216) % 256,
    Math.floor(bitLow / 65536) % 256,
    Math.floor(bitLow / 256) % 256,
    bitLow % 256
  );
  for (offset = 0; offset < tail.length; offset += 64) {
    compress(tail, offset, state);
  }

  var out = '';
  var i;
  var hex;
  for (i = 0; i < 8; i++) {
    hex = (state[i] >>> 0).toString(16);
    while (hex.length < 8) {
      hex = '0' + hex;
    }
    out += hex;
  }
  return out;
};

export function makeScalarCompressor() {
  return SCALAR_FACTORY();
}

export function sourceForLayout(name) {
  var body;
  if (name === 'A') {
    body = make64WordCompressor.toString();
  } else if (name === 'B') {
    body = make16WordCompressor.toString();
  } else {
    body = scalarCompressorSource();
  }
  return 'var K = ' + JSON.stringify(K) + ';\n' +
    'function rotateRight(word, count) { var right = word >>> count; var left = word << (32 - count); var rotated = right | left; return rotated >>> 0; }\n' +
    body + '\n' + DIGEST_SOURCE.toString();
}
