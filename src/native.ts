import { crc32Bytes as crc32Oracle } from './crc32';
import { sha256Bytes as sha256Oracle } from './sha256';

var nativeLibrary: any = null;
var nativePath = '';
var nativeError = '';
var sequence = 0;
var bundleDir = '';

try {
  bundleDir = new File($.fileName).parent.fsName;
} catch (ignoreBundlePath) {}

function isLowerHexDigest(value: string): boolean {
  var i: number;
  var code: number;
  if (value.length !== 64) return false;
  for (i = 0; i < 64; i++) {
    code = value.charCodeAt(i);
    if (!((code >= 48 && code <= 57) || (code >= 97 && code <= 102))) return false;
  }
  return true;
}

function defaultNativePath(): string {
  var manifest: any = null;
  var candidate: any = null;
  var name: string;
  var i: number;
  var code: number;
  if (!bundleDir) return '';
  try {
    manifest = new File(bundleDir + '/native/ESHASHNative.current');
    manifest.encoding = 'UTF-8';
    if (manifest.exists && manifest.open('r')) {
      name = String(manifest.read());
      manifest.close();
      if (name.length === 33 && name.substring(0, 13) === 'ESHASHNative_' && name.substring(29) === '.dll') {
        for (i = 13; i < 29; i++) {
          code = name.charCodeAt(i);
          if (!((code >= 48 && code <= 57) || (code >= 97 && code <= 102))) break;
        }
        if (i === 29) {
          candidate = new File(bundleDir + '/native/' + name);
          if (candidate.exists) return candidate.fsName;
        }
      }
    }
    candidate = new File(bundleDir + '/native/release/ESHASHNative.dll');
    return candidate.exists ? candidate.fsName : '';
  } catch (error) {
    try { if (manifest && manifest.opened) manifest.close(); } catch (ignoreClose) {}
    nativeError = String(error);
    return '';
  }
}

function fileDigest(bytes: string, method: string, fallback: (value: string) => any): any {
  var file: any = null;
  var result: any;
  var i: number;
  if (nativeLibrary === null) return fallback(bytes);
  if (typeof bytes !== 'string') return fallback(bytes);
  for (i = 0; i < bytes.length; i++) {
    if (bytes.charCodeAt(i) > 255) return fallback(bytes);
  }
  try {
    sequence++;
    file = new File(Folder.temp.fsName + '/eshash-' + new Date().getTime() + '-' + Math.floor(Math.random() * 4294967296) + '-' + sequence + '.bin');
    file.encoding = 'BINARY';
    if (!file.open('w')) throw new Error('cannot create temporary input file');
    file.write(bytes);
    file.close();
    result = nativeLibrary[method](file.fsName);
    if (method === 'sha256File') {
      if (typeof result !== 'string' || !isLowerHexDigest(result)) throw new Error('native SHA-256 returned an invalid digest');
    } else if (typeof result !== 'number' || result < 0 || result > 4294967295 || Math.floor(result) !== result) {
      throw new Error('native CRC-32 returned an invalid value');
    }
    nativeError = '';
    return result;
  } catch (error) {
    nativeError = String(error);
    try { if (file && file.opened) file.close(); } catch (ignoreClose) {}
    return fallback(bytes);
  } finally {
    try { if (file) file.remove(); } catch (ignoreRemove) {}
  }
}

export function loadNative(path?: string): boolean {
  var candidates: string[] = [];
  var i: number;
  var candidate: any;
  var library: any;
  if (typeof ExternalObject === 'undefined') { nativeError = 'ExternalObject is unavailable'; return false; }
  if (path) candidates.push(path);
  else {
    var defaultPath = defaultNativePath();
    if (defaultPath) candidates.push(defaultPath);
  }
  for (i = 0; i < candidates.length; i++) {
    try {
      candidate = new File(candidates[i]);
      if (!candidate.exists) continue;
      library = new ExternalObject('lib:' + candidate.fsName);
      if (Number(library.version) !== 1 || typeof library.abiRevision !== 'function' ||
          Number(library.abiRevision()) !== 1 ||
          typeof library.sha256File !== 'function' || typeof library.crc32File !== 'function') {
        try { library.unload(); } catch (ignoreUnload) {}
        throw new Error('ESHASH native DLL ABI mismatch');
      }
      nativeLibrary = library;
      nativePath = candidate.fsName;
      nativeError = '';
      return true;
    } catch (error) { nativeError = String(error); }
  }
  nativeLibrary = null;
  nativePath = '';
  return false;
}

export function unloadNative(): boolean {
  var library = nativeLibrary;
  if (library === null) return true;
  try {
    library.unload();
    nativeLibrary = null;
    nativePath = '';
    return true;
  } catch (error) {
    nativeError = String(error);
    return false;
  }
}

export function nativeStatus(): any {
  return {
    loaded: nativeLibrary !== null,
    path: nativePath,
    error: nativeError,
    abiRevision: nativeLibrary ? Number(nativeLibrary.abiRevision()) : null,
    abi: 'ESABI 0.3.1 / Windows LONG32'
  };
}

export function sha256Bytes(bytes: string): string {
  return fileDigest(bytes, 'sha256File', sha256Oracle);
}

export function crc32Bytes(bytes: string): number {
  return fileDigest(bytes, 'crc32File', crc32Oracle);
}
