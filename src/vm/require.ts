/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */

/* eslint-disable global-require */
/* eslint-disable import/no-dynamic-require */
import { RequireError } from '@/vm/error';
import Logger from '@/logger';
import { getSystemInfo } from '@/utils/info';

import {
  ENGINE_VERSION,
  ENGINE_BUILD_TIME,
  ENGINE_VERSION_UINT,
} from '@/utils';

/**
 * @notice dynamic require, must be explicitly added in package.json
 */
const REQUIRE_MODULE = {
  lodash: true,
  'crypto-js': true,
  'fast-xml-parser': true,
  'node-rsa': true,
  cheerio: true,
  moment: true,
  uuid: true,
  chai: true,
  mime: true,
  'jsonpath-plus': true,
  // webdriverio: true,
  yaml: true,
  mustache: true,
  // atob @todo
  // btoa @todo
  /** builtin */
  // fs: 'builtin', // 不允许读取本地文件
  crypto: true,
  path: true,
  querystring: true,
  url: true,
  assert: true,
  buffer: true,
  os: true,
  // string_decoder: true,
  // util: true,
  zlib: true,
  // zlib: {
  //   constants: zlib.constants,
  //   brotliCompressSync: zlib.brotliCompressSync,
  //   brotliDecompressSync: zlib.brotliDecompressSync,
  //   deflateSync: zlib.deflateSync,
  //   deflateRawSync: zlib.deflateRawSync,
  //   gunzipSync: zlib.gunzipSync,
  //   gzipSync: zlib.gzipSync,
  //   inflateSync: zlib.inflateSync,
  //   inflateRawSync: zlib.inflateRawSync,
  //   unzipSync: zlib.unzipSync,
  // },
  /** debug */
  engine: {
    ENGINE_VERSION,
    ENGINE_BUILD_TIME,
    ENGINE_VERSION_UINT,
    // getSystemInfo,
  },
} as (Record<string, true | string | Record<string, unknown>>);

const REQUIRE_MAP = Object.keys(REQUIRE_MODULE);

/**
 * 引擎内部的 require
 * 做了一些限制
 */
export default (moduleName: string): any => {
  try {
    const module = REQUIRE_MAP.find((name) => moduleName.indexOf(name) === 0);
    if (!module) {
      throw new RequireError(moduleName);
    }
    const mod = REQUIRE_MODULE[module];
    if (mod) {
      if (typeof mod === 'string') {
        return require(mod);
      }
      if (typeof mod === 'boolean') {
        return require(moduleName);
      }
      return mod;
    }
    return module;
  } catch (e) {
    Logger.error(e.message);
    throw e;
  }
};
