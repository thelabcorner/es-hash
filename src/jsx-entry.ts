// ExtendScript entry point: importing named functions is safe, exporting this
// facade is not. An exported entrypoint makes esbuild emit namespace helpers
// that depend on descriptor APIs absent from the portable ES3 profile.
import {
  createCrc32,
  crc32Bytes,
  crc32Text,
  createSha256,
  sha256Bytes,
  sha256Text
} from './index';

function makeFacade(): any {
  return {
    createCrc32: createCrc32,
    crc32Bytes: crc32Bytes,
    crc32Text: crc32Text,
    createSha256: createSha256,
    sha256Bytes: sha256Bytes,
    sha256Text: sha256Text
  };
}

var __eshashGlobal: any = $.global;
__eshashGlobal['ESHASH'] = makeFacade();
