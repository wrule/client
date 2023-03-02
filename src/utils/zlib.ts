/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import zlib from 'node:zlib';
import { PROTOCOL_OPTIONS } from '@/dispatch/enum';

/**
 * encodeBrotli
 * @see https://github.com/google/brotli
 * @param string
 * @returns {Promise<Buffer>}
 */
export const encodeBrotli = (string: Buffer | string): Promise<Buffer> => new Promise((result, reject) => {
  zlib.brotliCompress(string, {
    params: {
      [zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_TEXT,
      [zlib.constants.BROTLI_PARAM_QUALITY]: 4, // zlib.constants.BROTLI_MAX_QUALITY,
    },
  }, (err, ret) => {
    if (!err) {
      result(ret);
    } else {
      reject(err);
    }
  });
});

export const encodeBrotliSync = (string: Buffer | Uint8Array | string): Buffer => zlib.brotliCompressSync(string, {
  params: {
    [zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_TEXT,
    [zlib.constants.BROTLI_PARAM_QUALITY]: 4, // zlib.constants.BROTLI_MAX_QUALITY,
  },
});

export const decodeWithOptionsAsObject = async <T>(buf: Buffer | Uint8Array, options = 0): Promise<T> => new Promise((resolve, reject) => {
  try {
    if ((options & PROTOCOL_OPTIONS.GZIP) !== 0) {
      zlib.gunzip(buf, (err, ret) => {
        if (!err) {
          resolve(JSON.parse(ret.toString('utf-8')));
        } else {
          reject(err);
        }
      });
    } else if ((options & PROTOCOL_OPTIONS.BROTLI) !== 0) {
      zlib.brotliDecompress(buf, (err, ret) => {
        if (!err) {
          resolve(JSON.parse(ret.toString('utf-8')));
        } else {
          reject(err);
        }
      });
    } else {
      resolve(JSON.parse(buf.toString('utf-8')));
    }
  } catch (err) {
    reject(err);
  }
});
