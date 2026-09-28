<div align="center">

# ESHASH: CRC-32 and SHA-256 for Adobe ExtendScript (ES3)

## ExtendScript Hash = E.S.HASH

### Streaming `crc32` / `sha256` for binary strings and UTF-8 text in Adobe Illustrator, InDesign, Photoshop & any ExtendScript host

[![Algorithms: SHA-256 + CRC-32](https://img.shields.io/badge/algorithms-SHA--256%20%2B%20CRC--32-success)](https://csrc.nist.gov/pubs/fips/180-4/upd1/final)
[![Differential: Node](https://img.shields.io/badge/differential-Node%2016%2C388%20checks-purple)](#validation)
[![Engine parity](https://img.shields.io/badge/engine%20parity-live%2018%2F18%20vectors-green)](#validation)
[![Adobe: Creative Suite](https://img.shields.io/badge/Adobe%20-Creative%20Suite-red?logo=adobe&logoColor=white)](https://extendscript.docsforadobe.dev/)
[![Engine](https://img.shields.io/badge/ExtendScript-ES3-green)](#compatibility)
[![Runtime size](https://img.shields.io/badge/runtime-19.1%20KiB-orange)](#installation)
[![License: GPL-3.0-or-later](https://img.shields.io/badge/license-GPL%203.0--or--later-blue)](https://www.gnu.org/licenses/gpl-3.0.html)

</div>

---

## Part Of The Same Toolkit

> Production-grade infrastructure for Adobe ExtendScript.

<table>
<tr>
<td width="50%" valign="top">

### Runtime Primitives

**[ESON](https://github.com/thelabcorner/eson)**  
Strict RFC 8259 JSON for ExtendScript.

**[ESB64](https://github.com/thelabcorner/es-b64)**  
Base64 and UTF-8 utilities.

**[ESARR](https://github.com/thelabcorner/es-arr)**  
ES5+ Array compatibility methods.

**[ESSTR](https://github.com/thelabcorner/es-str)**  
String whitespace and trim methods.

**[ESCHARS](https://github.com/thelabcorner/es-chars)**  
Native bulk byte operations.

**[ESHTTP](https://github.com/thelabcorner/es-http)**  
HTTP transport for ExtendScript automation.

**[ESTIMER](https://github.com/thelabcorner/es-timer)**  
Microsecond timing for ExtendScript automation.

**[ESRAND](https://github.com/thelabcorner/es-rand)**  
Deterministic random streams and sampling for ExtendScript.

**[ESUUID](https://github.com/thelabcorner/es-uuid)**  
RFC 9562 UUID generation, parsing, and conversion for ExtendScript.

**[ESENV](https://github.com/thelabcorner/es-env)**  
Environment and capability detection for ExtendScript.

**[ESPATH](https://github.com/thelabcorner/es-path)**  
Deterministic Windows/POSIX path and RFC 8089 file-URI transformations.

**[ESFS](https://github.com/thelabcorner/es-fs)**  
Synchronous ExtendScript File/Folder I/O with explicit text, BINARY, and replacement semantics.

**[ESHASH](https://github.com/thelabcorner/es-hash)**  
CRC-32/ISO-HDLC and SHA-256 for byte strings and UTF-8 text.

**[ESLOG](https://github.com/thelabcorner/es-log)**  
Structured logging with bounded text and JSONL sinks.

</td>
<td width="50%" valign="top">

### Build & Integration Tools

**[ESPACK](https://github.com/thelabcorner/espack)**  
Self-extracting ExternalObject bundles.

**[ESMIN](https://github.com/thelabcorner/es-min)**  
Minification for shipped JSX bundles.

**[ESABI](https://github.com/thelabcorner/esabi)**  
Modern ExternalObject ABI declarations for native integrations.

**[VectorIPC](https://github.com/thelabcorner/vector-ipc)**  
Bounded local IPC for scripting hosts and native plug-ins.

**[ESTC](https://github.com/thelabcorner/estc)**  
TypeScript-to-ExtendScript build, compatibility, and live-parse tooling.

**[ESDB](https://github.com/thelabcorner/esdb)**  
Native state and durable storage for Adobe tooling.

**[COMTool](https://github.com/thelabcorner/COMTool)**  
Guarded COM, ExtendScript, plug-in, and debugger automation for Adobe desktop apps.

**ESsemble** <sub>coming soon</sub>  
Typed framework, resolver, and composition layer for the ExtendScript toolkit.

**ESOBF** <sub>coming soon</sub>  
Obfuscation for hardened JSX distribution.

</td>
</tr>
</table>

Also from the same team: **[ArcFit.dev](https://arcfit.dev)**, deterministic arc warp for Illustrator.

---

## Table of Contents

- [Why ESHASH?](#why-eshash)
- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [API](#api)
  - [SHA-256](#sha-256)
  - [CRC-32/ISO-HDLC](#crc-32iso-hdlc)
- [Validation](#validation)
- [Spec Conformance](#spec-conformance)
- [Performance](#performance)
  - [SHA-256 layout comparison on live ExtendScript](#sha-256-layout-comparison-on-live-extendscript)
  - [CRC-32 table startup and scan](#crc-32-table-startup-and-scan)
- [Security Model](#security-model)
- [Compatibility](#compatibility)
- [Engine quirks that shaped the design](#engine-quirks-that-shaped-the-design)
  - [Inherited ecosystem evidence](#inherited-ecosystem-evidence-separate-from-eshash-measurements)
  - [ESHASH measurements](#eshash-measurements)
- [Development](#development)
- [Repository layout](#repository-layout)
- [Credits](#credits)
- [License](#license)

---

## Why ESHASH?

ExtendScript consumers often need a stable digest over either raw byte data or text, but those are different inputs. ESHASH makes the distinction explicit: `updateBytes` accepts a binary string whose code units are in `0..255`, while `updateText` encodes Unicode text as UTF-8. This prevents an implicit text encoding from silently changing the bytes being hashed.

The correctness/reference implementation is dependency-free ES3. Its public surface includes streaming and one-shot forms of CRC-32/ISO-HDLC and SHA-256. The preferred accelerated distribution is a self-extracting ESPACK bundle: it carries the ESABI-backed x64 payload plus the shared ESB64Native extraction accelerator in one JSX artifact, then adopts ESPACK's cached ExternalObject handle instead of opening a second copy. The SHA-256 algorithm follows FIPS 180-4 §6.2.2; the CRC check value follows the CRC-32/ISO-HDLC parameter set.

---

## Features

- Streaming `createSha256()` and `createCrc32()` hashers; no input-sized byte array is created.
- `sha256Bytes` / `crc32Bytes` process binary strings without text conversion; U+0000 is a byte, not a terminator.
- `sha256Text` / `crc32Text` use UTF-8, combine valid surrogate pairs, and replace an unpaired surrogate with U+FFFD.
- SHA-256 returns lowercase 64-digit hexadecimal; CRC-32 returns an unsigned 32-bit number and an eight-digit lowercase hexadecimal form.
- The emitted `dist/ESHASH.jsx` is 20,832 bytes with the native-gate bridge; the Node ESM build is emitted separately as `dist/eshash-core.esm.mjs`.
- `dist/ESHASH.accel.jsx` is the self-extracting ESPACK distribution; `ESHASH.accel.min.jsx` is the conservatively minified equivalent. Both embed `ESHASHNative_v1.dll` plus shared `ESB64Native_v2.dll`.
- Accelerator auto-routing is evidence-driven: SHA-256 one-shot byte hashing adopts the native lane automatically; CRC-32 stays on the ES3 oracle by default because repeated end-to-end measurements crossed both sides of parity. `ESHASH.useEspack({ crc32: true })` opts into native CRC explicitly.

---

## Installation

Install the development dependencies and build the distributable JSX:

```bash
npm install
npm run build
```

Include `dist/ESHASH.jsx` in an Illustrator script:

```jsx
// @includepath "path/to/eshash/dist"
#include "ESHASH.jsx"
```

The Node ESM entry is `dist/eshash-core.esm.mjs`.

For a self-contained accelerated Illustrator distribution:

```bash
npm run build:native
npm run build:accel:strict
```

Then load `dist/ESHASH.accel.jsx` (or the minified equivalent) instead of managing a DLL beside the script. ESPACK materializes the versioned payload under the local application-data cache, reuses its process-wide library cache on later loads, and exposes the adopted lane through `ESHASH.espack`.

---

## Quick Start

```jsx
var textHash = ESHASH.sha256Text("Illustrator \u00e9 \ud83d\ude00");
var byteHash = ESHASH.sha256Bytes("\u0000\u00ff");
var crcHex = ESHASH.createCrc32().updateText("123456789").hexDigest();

// Incremental updates preserve a surrogate pair even when split between calls.
var sha = ESHASH.createSha256();
sha.updateText("prefix\ud83d");
sha.updateText("\ude00suffix");
var streamed = sha.digest();
```

---

## API

### SHA-256

- `sha256Bytes(bytes: string): string` — one-shot SHA-256 over code units in `0..255`; rejects a code unit above 255 with `RangeError`.
- `sha256Text(text: string): string` — one-shot SHA-256 over UTF-8 text. Lone UTF-16 surrogates become U+FFFD.
- `createSha256(): Sha256Hasher` — creates an incremental hasher.
- `Sha256Hasher.updateBytes(bytes)` / `updateText(text)` — append byte-defined or UTF-8 text input and return the hasher.
- `Sha256Hasher.digest(): string` — finalizes and returns lowercase hexadecimal. Repeated digest calls return the same value; updates after finalization throw.

### CRC-32/ISO-HDLC

- `crc32Bytes(bytes: string): number` — one-shot CRC-32 over code units in `0..255`.
- `crc32Text(text: string): number` — one-shot CRC-32 over UTF-8 text. Lone UTF-16 surrogates become U+FFFD.
- `createCrc32(): Crc32Hasher` — creates an incremental hasher.
- `Crc32Hasher.updateBytes(bytes)` / `updateText(text)` — append input and return the hasher.
- `Crc32Hasher.digest(): number` — finalizes and returns an unsigned 32-bit number.
- `Crc32Hasher.hexDigest(): string` — finalizes and returns eight lowercase hexadecimal digits.

An update error invalidates that hasher; later reads throw rather than return a partial digest. A failed type check for a non-string argument does not alter a valid hasher.

### Accelerator / native gate

- `ESHASH.espack` — present on the ESPACK accelerator artifact; records the automatic adoption result.
- `ESHASH.useEspack(options?)` — re-adopts the ESPACK-owned `ESHASHNative` handle. SHA-256 is native by default; pass `{ crc32: true }` to opt CRC-32 into the native file lane.
- `ESHASH.nativeStatus()` — reports the active ABI, path, ownership source, and per-algorithm routing.
- `ESHASH.unloadNative()` — unloads a directly-owned DLL, but only detaches ESHASH from an ESPACK-owned handle. ESPACK remains the authority for its cached library.
- `ESHASH.loadNative(path?)` — compatibility/development lane for an explicitly deployed raw DLL; it retains the historical behavior of enabling both one-shot byte algorithms.

---

## Validation

| Check | Command | Result |
|---|---|---|
| Strict TypeScript | `npm run typecheck` | clean |
| Fixed vectors, streaming boundaries, state errors | `node tests/core-test.mjs` | 68 assertions passed |
| Deterministic differential/fuzz checks | `node tests/differential.mjs` | 16,388 checks; seed `0x5EED1234`; 2,048 byte cases, 2,048 text cases, and a 256 KiB payload |
| Generated JSX structural contract | `node tests/artifact-contract.mjs` | ES3 parse; no mixed bitwise/shift expression; 20,832-byte artifact |
| Full static gate | `npm test` | build + all Node checks passed |
| ESTC JSX check | `npm run estc:static` | passed |
| Live Illustrator vectors | `npm run live-verify` | 18/18 vectors passed on Illustrator 30.6.0 / ExtendScript 4.5.6 |
| Live compile-only parse | `npm run estc:live-parse` | passed; no project code executed by the parser gate |
| Native file-transport parity | `npm run live-verify` after `npm run build:native` | 18/18 vectors, including embedded NUL and all byte values, passed on Illustrator 30.6.0 / ExtendScript 4.5.6 |
| Packaged native fallback | `npm run native:release:live` | pass; staged package layout loads `native/release/ESHASHNative.dll` with ABI revision 1 and correct SHA-256 |
| Native end-to-end benchmark | `npm run benchmark:native:live` | 4 KiB byte string, 2 warmups, 7 samples; timings include BINARY temp-file write, native file read, ABI call, and cleanup |
| ESPACK byte/provenance contract | `npm run accel:contract` | pass; payload + ESB64Native bytes match build inputs, the bundle contains the current sibling ESB64 runtime byte-for-byte, and the npm whitelist exposes only the stable raw DLL |
| Accelerator static + live parse | `npm run estc:accel:live` | 3/3 artifacts pass ES3 static checks and live compile-only parsing |
| Full accelerator behavior | `npm run accel:live` | 13/13 checks pass: adoption, SHA/CRC parity, ownership, detach/re-adopt, and explicit CRC opt-in |
| Minified accelerator behavior | `npm run accel:live:min` | same 13/13 live checks pass on the conservative minified artifact |

The SHA-256 oracle is Node `crypto.createHash('sha256')`; CRC differential checks use an independent bit-at-a-time reference. The live verifier transports UTF-16 code units as hexadecimal so NUL and unpaired surrogates survive the COM boundary. `npm run build:native` emits a content-addressed DLL and `dist/native/ESHASHNative.current`; the verifier follows that manifest and exercises the native file lane, including embedded NUL bytes.

---

## Spec Conformance

- **SHA-256:** FIPS 180-4 §6.2.2 examples for the empty string, `abc`, the 56-byte message, and one million `a` characters.
- **CRC-32/ISO-HDLC:** the standard `123456789` check value is `0xCBF43926`; the implementation uses reflected polynomial `0xEDB88320`, initial value `0xFFFFFFFF`, and final XOR `0xFFFFFFFF`.
- **UTF-8 text adapter:** replacement behavior for unpaired surrogates follows the WHATWG Encoding Standard `TextEncoder` string conversion.

---

## Performance

### SHA-256 layout comparison on live ExtendScript

Measured inside Illustrator 30.6.0 / ExtendScript 4.5.6 on 2026-09-28. Each sample used `$.hiresTimer`; the harness primes the delta clock before timing, takes two warmups per lane and reports the median. Sample counts were 7 for 64 B / 1 KiB, 5 for 64 KiB, and 3 for 256 KiB. Input construction occurred before the timed region.

| Input | A: 64-word schedule (µs) | B: 16-word circular schedule (µs) | C: scalar-unrolled (µs) |
|---|---:|---:|---:|
| 1 block, 64 B | 1,425.20 | 1,345.85 | 701.35 |
| 16 blocks, 1,024 B | 11,127.33 | 11,044 | 4,412 |
| 1 KiB, 1,024 B | 10,040 | 10,632.33 | 4,528 |
| 64 KiB | 601,425 | 613,236 | 256,849 |
| 256 KiB | 2,348,245 | 2,434,258 | 1,018,201 |

The kernel-size and same-process parse/eval measurements used the exact ES3 source generated for each layout. Parse/eval medians are 7 `$.evalFile` samples; source sizes include the constants and common one-shot digest helper.

| Layout | Generated kernel source | Same-process parse/eval median | First 64 B digest |
|---|---:|---:|---:|
| A | 5,365 B | 960 µs | 1,488 µs |
| B | 5,610 B | 824 µs | 1,398 µs |
| C | 77,141 B | 6,822 µs | 1,984 µs |

A and B are near parity in the live engine; A is smaller and has lower medians at 1 KiB, 64 KiB, and 256 KiB, while B was marginally faster on the 64 B and 16-block samples. C cuts measured digest time by about 2.3× at 64 KiB and 256 KiB, while its generated kernel is 14.4× larger and adds about 5.9 ms to parse/eval versus A. The shipped build keeps A to bound per-eval code size and load cost. C remains in the benchmark harness as the measured bulk-throughput option; its full production bundle was not generated.

Node cross-check, Node.js v22.23.2, `process.hrtime.bigint()`, seven samples after workload-specific warmups (100 / 50 / 50 / 5 / 2):

| Input | A (µs) | B (µs) | C (µs) |
|---|---:|---:|---:|
| 1 block, 64 B | 3.28 | 2.63 | 1.97 |
| 16 blocks, 1,024 B | 18.83 | 14.90 | 9.32 |
| 1 KiB, 1,024 B | 18.86 | 14.93 | 9.36 |
| 64 KiB | 1,027.10 | 846.50 | 448.70 |
| 256 KiB | 4,317.60 | 3,387.80 | 1,817.90 |

The Node ordering differs for A and B from the live engine; ExtendScript measurements drive the shipped schedule decision.

### Optional ESABI lane: end-to-end file transport

Measured 2026-09-28 on Illustrator 30.6.0 / ExtendScript 4.5.6, x64 Windows using the `/MT` DLL build. Each 4 KiB sample hashes the same binary string end-to-end. Both lanes include a fresh hasher; the native one-shot lane additionally writes the input to a BINARY temp file, makes the ExternalObject call, lets native code read the file, and removes it. Two warmups preceded seven samples. Across the final hardened runs, SHA-256 ranged from roughly **4.83× to 7.73× faster** end-to-end. CRC-32 did **not** establish a stable performance win: observed runs ranged from about **1.39× faster to 0.92× as fast** as pure JSX. The exact-commit release run measured SHA-256 native **6,746 µs** vs pure JSX **52,164 µs** (~7.73×), while CRC-32 measured **8,983 µs** native vs **8,239 µs** pure JSX (native ~9.0% slower). SHA-256 is therefore the demonstrated acceleration lane at this size; CRC remains an opt-in parity-capable native path, not a performance recommendation. This is one workload and host version, not a general throughput claim. Each lane's result was checked against known/reference output before timing.

### CRC-32 table startup and scan

The runtime-generated table builder is 384 source bytes. The precomputed array is 2,768 JSX bytes. Node.js 22.23.2 medians (11 table-initialization runs, seven 256 KiB scan samples) were 39.2 µs for runtime generation versus 5.9 µs for literal parse/array creation; the scan was 1,007.3 µs versus 1,014.5 µs.

With the same ESTC configuration, the full JSX grew from 13,265 bytes with the generated table to 15,760 bytes with the literal table (+2,495 bytes).

Live on Illustrator 30.6.0 / ExtendScript 4.5.6, seven initialization/first-use samples and five 256 KiB scan samples:

| Lane | Median | Spread |
|---|---:|---:|
| Runtime table construction | 477 µs | 443–550 µs |
| Literal `eval` + array construction probe | 155 µs | 141–308 µs |
| First CRC call, generated table + `123456789` | 480 µs | 475–522 µs |
| First CRC call, precomputed table + `123456789` | 18 µs | 17–26 µs |
| 256 KiB scan, generated table | 444,894 µs | 440,307–539,283 µs |
| 256 KiB scan, literal table | 449,060 µs | 433,857–522,451 µs |

The shipped CRC lane uses the literal table. The measured 2,768-byte data cost reduces first-use latency by roughly 27×; warm scan throughput was within about 1%. The initialization probe uses `eval` only in the benchmark to time literal parsing; the production bundle does not use `eval`.

---

## Security Model

ESHASH is a deterministic data-transform library. `ESHASH.jsx` and the streaming implementations remain pure ES3 until a native gate is enabled. The ESPACK accelerator intentionally enables that gate during bundle evaluation; the raw-DLL compatibility lane does so only after `loadNative()`. Native byte hashing writes the byte string through ExtendScript `File` in `BINARY` mode to a uniquely named temporary file; only the UTF-8 file path crosses the ExternalObject string ABI. This avoids sending payload bytes, including U+0000, through a channel known to truncate at NUL. Temporary inputs are removed after each call. If a native operation fails, the one-shot byte call falls back to its pure implementation; `nativeStatus()` reports the last native error. Text and streaming APIs remain pure JSX.

ESPACK owns libraries that it materializes and caches. ESHASH therefore records native-handle ownership: `unloadNative()` calls `ExternalObject.unload()` only for handles opened by `loadNative()`; for an ESPACK-adopted handle it detaches ESHASH state without invalidating ESPACK's shared cache. SHA-256 alone is not a message-authentication code, password hash, or key-derivation function; use a dedicated construction for those purposes. CRC-32 is for accidental-corruption checks, not adversarial integrity.

```jsx
if (ESHASH.loadNative()) {
  // SHA/CRC one-shot *byte* calls now use the file-backed native lane.
  // Streaming hashers and text digests continue to use the pure JSX oracle.
}
```

Build the optional DLL with `npm run build:native`. The repository carries an immutable ESABI 0.3.1 / ABI revision 1 header snapshot under `deps/esabi`, pinned to commit `65c9c3ce627a26a89d6bf90547678841df0cf981`; the build validates that pin before compiling. DLL filenames are content-addressed from native source + ESABI headers + pin + build recipe + MSVC identity, and `dist/native/ESHASHNative.current` selects the active development build. The stable `dist/native/release/ESHASHNative.dll` feeds both the raw-DLL compatibility package surface and the ESPACK payload. The accelerator build uses the current sibling `esb64/dist/vendor-esb64-runtime.js` and `esb64/native/bin/ESB64Native.dll` explicitly rather than ESPACK's vendored snapshots. `npm pack --dry-run` contains the four accelerator artifacts and exactly one raw DLL. Illustrator 30.6 can keep an unloaded module mapping locked, so direct-DLL cleanup remains best-effort/deferred rather than an in-place rebuild assumption. Native builds target x64 Windows only and use Windows CNG for SHA-256.

---

## Compatibility

| Target | Status |
|---|---|
| ExtendScript ES3 | ESTC-built JSX; static and live parse checks passed |
| Illustrator 30.6.0 / ExtendScript 4.5.6 | Live parity verified (18/18 vectors) |
| ESPACK accelerator | Full + minified bundles live-verified; ESB64Native v2 extraction + ESHASHNative v1 adoption |
| Other ExtendScript hosts | ES3-oriented implementation; not live-tested here |
| Node.js 20+ | ESM build and test harnesses; Node 22.23.2 measured |

---

## Engine quirks that shaped the design

The following inherited findings were measured by sibling libraries and are cited as context, not as ESHASH benchmarks. Their live scope is Illustrator 30.6.0 / ExtendScript 4.5.6 unless the linked source states otherwise.

### Inherited ecosystem evidence (separate from ESHASH measurements)

- **ESARR — variable-index arrays:** a live variable-index array read cost about `7.5e-4 µs × distinct indices accessed`; a 32K traversal was about 800 ms, while constant-index reads were about 0.1 µs. This motivated testing the 64-word and 16-word schedule layouts; it does not predict their timings by itself. [ESARR engine evidence](https://github.com/thelabcorner/es-arr/blob/main/README.md#engine-quirks-that-shaped-the-design).
- **ESB64 — bitwise precedence and NUL:** `128 | c & 63` was evaluated as `(128 | c) & 63` in the engine, corrupting a UTF-8 byte; its byte builders split each bitwise operation into temporaries. Its `charAt` probe also found U+0000 returned an empty string. ESHASH uses staged bitwise temporaries and `charCodeAt`. [ESB64 engine evidence](https://github.com/thelabcorner/es-b64/blob/main/README.md#engine-quirks-that-shaped-the-design).
- **ESON — string and native-channel boundaries:** `charAt` returned `""` at U+0000 while `charCodeAt` returned zero; loop concatenation was effectively quadratic in ESON's measured workloads. ESON also measured NUL truncation and surrogate limitations on the ExternalObject string channel. ESHASH therefore keeps byte processing in the pure JSX lane and does not transport arbitrary bytes through ExternalObject. [ESON engine evidence](https://github.com/thelabcorner/eson/blob/main/README.md#engine-quirks-that-shaped-the-design).
- **ESSTR — lookup-table context:** a 256-entry table for whitespace classification was about 30–40% slower than a short comparison chain. That is a different operation and is not used as evidence for CRC table performance; ESHASH measured its own generated and literal CRC tables. [ESSTR engine evidence](https://github.com/thelabcorner/es-str/blob/main/README.md#engine-quirks-that-shaped-the-design).
- **ESCHARS — per-unit workload hazards:** `charCodeAt` was about 0.95 µs per unit, and a particular `charCodeAt` plus array/output-building transform completed at 64 Ki units but wedged at 128 Ki. That result is specific to the measured transform; ESHASH's SHA-256 binary lane completed 256 KiB in the live benchmark. [ESCHARS engine evidence](https://github.com/thelabcorner/es-chars/blob/main/README.md#engine-quirks-that-shaped-the-design).
- **ESTIMER — timer protocol:** `$.hiresTimer` is a delta source, not a timestamp; the first read can reflect engine age, tight reads can return zero, and the measured raw read overhead was about 1 µs median / 2 µs p99. The live benchmark primes the timer twice and batches short operations. [ESTIMER engine evidence](https://github.com/thelabcorner/es-timer/blob/main/README.md#engine-quirks-that-shaped-the-design).

### ESHASH measurements

- Source review found unsafe combined shifts/bitwise operations in SHA-256 word assembly, rotation, length assembly, CRC table construction, UTF-8 byte construction, and CRC updates. The implementation stages each bitwise operation through a temporary. `tests/artifact-contract.mjs` parses the emitted JSX and rejects any expression tree containing more than one bitwise/shift operator; it also has safe/unsafe fixtures.
- UTF-8 text processing uses a pending-high-surrogate state so each input code unit is read once with `charCodeAt`, including when a pair crosses `updateText` calls.
- FIPS padding boundaries 55, 56, 57, 63, 64, 119, and 120 bytes are fixed regression vectors. The 56-byte case caught and fixed a padding loop that failed to stop when block compression reset `blockLength` to zero.
- The live parity and benchmark commands above were run through ESTC/COMTool V2 against the installed Illustrator instance; the 256 KiB live benchmark completed for all three SHA layouts and both CRC table lanes.

---

## Development

```bash
npm install
npm run build
npm run typecheck
npm test
npm run estc:static
npm run estc:live-parse    # requires an already-running Illustrator; does not launch it
npm run live-verify        # 18 behavioral vectors in the real engine
npm run benchmark          # Node layout/table comparison
npm run benchmark:live     # ExtendScript layout/table and parse/eval comparison
npm run build:native       # optional x64 Windows ExternalObject DLL + packaged release copy
npm run build:accel:strict # ESPACK manifest + facade + full/minified self-extracting bundles
npm run accel:contract     # byte-exact payload/accelerator provenance
npm run estc:accel:live    # facade + full/minified ES3 and live parse
npm run accel:live         # full self-extracting bundle behavior
npm run accel:live:min     # minified self-extracting bundle behavior
npm run native:release:live # prove the no-manifest packaged fallback layout in Illustrator
npm run benchmark:native:live # valid end-to-end comparison; requires DLL + running Illustrator
npm run release:gate       # full static/native/ESPACK/live release closure
```

`npm test` builds `dist/ESHASH.jsx` and the Node ESM core, runs authoritative and streaming-boundary vectors, deterministic differential checks, and the generated-artifact structural audit. The live benchmark is separate from production code and requires COMTool V2 plus an already-running Illustrator instance.

---

## Repository layout

```text
eshash/
  src/                  TypeScript CRC-32/SHA-256 core and JSX facade
  tests/                fixed vectors, deterministic differential tests, artifact audit, benchmarks
  deps/esabi/           immutable ESABI 0.3.1 header snapshot + provenance pin
  native/               ESABI-backed x64 Windows DLL source
  build-native.ps1      pinned-header MSVC x64 DLL build
  dist/                 generated base, ESPACK accelerator, manifest, and Node ESM output (gitignored)
  eshash-build.mjs      ESM + ESTC + ESPACK accelerator composition
  extendscript.estc.config.mjs
  package.json
```

---

## Credits

- **NIST:** FIPS 180-4 SHA-256 definition and examples.
- **RevEng CRC Catalogue:** CRC-32/ISO-HDLC parameter reference.
- **Node.js:** independent `crypto` SHA-256, UTF-8, and binary-buffer differential oracles.
- **docsforadobe:** ExtendScript language and host documentation.
- **ESARR, ESB64, ESON, ESSTR, ESCHARS, and ESTIMER maintainers:** measured sibling-engine findings linked above; these are inherited context, not ESHASH performance results.

---

## License

GPL-3.0-or-later. See [LICENSE](LICENSE).

---

<p align="center"><small>ESHASH: ExtendScript Hash. Byte-defined inputs, spec-defined digests, engine-measured output.</small></p>
