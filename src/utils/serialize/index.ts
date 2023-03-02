/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
/* eslint-disable @typescript-eslint/no-unused-vars */

import Logger from '@/logger';
import { encodeBrotli } from '@/utils/zlib';
import { isObject, isArray } from '@/utils';

/**
 * 针对部分数据进行去除循环引用
 * 比较消耗性能，慎用。
 * @param object
 * @returns {T}
 */
export const cycle = <T = any>(object: unknown): T => {
  const map = new WeakMap(); // object to path mappings

  return (function loop(value: any, path: string): T {
    if (isObject(value) || isArray(value)) {
      const oldPath = map.get(value);
      if (oldPath !== undefined) {
        return { $ref: oldPath } as unknown as T;
      }

      map.set(value, path);

      if (Array.isArray(value)) {
        const arr: any[] = [];
        value.forEach((element, i) => {
          arr[i] = loop(element, `${path}[${i}]`);
        });
        return arr as unknown as T;
      }

      const obj: Record<any, any> = {};
      Object.keys(value).forEach((name) => {
        obj[name] = loop(value[name], `${path}[${JSON.stringify(name)}]`);
      });
      return obj as unknown as T;
    }
    return value as unknown as T;
  }(object, '$'));
};

enum ENGINE_FIELD_TYPE {
  BROTLI = 1,
}

/**
 * 对最终的数据结果转JSON进行处理
 * Buffer 转换为 压缩后数据 输出 base64
 * @param obj
 */
const transform = async (obj: unknown): Promise<unknown> => {
  try {
    if (Buffer.isBuffer(obj)) {
      const ret = await encodeBrotli(obj);
      return {
        __XEngineType: ENGINE_FIELD_TYPE.BROTLI,
        __XEngineLength: obj.length,
        __XEngineContent: ret.toString('base64'),
      };
    }
  } catch (e) {
    Logger.warn([`[transform] ${e.message}`]);
  }
  if (typeof obj === 'function' || typeof obj === 'bigint') {
    // [[function]]
    return obj.toString();
  }
  if (typeof obj === 'object' && obj !== null) {
    // console.log(obj, obj.constructor, obj.constructor === Array, Object.prototype.toString.call(obj));
    // console.log('=========================');
    if (isObject(obj) || isArray(obj)) {
      if (Array.isArray(obj)) {
        const ret: unknown[] = [];
        for (let index = 0; index < obj.length; index++) {
          const item = obj[index];
          ret.push(await transform(item));
        }
        return ret;
      }
      const ret: Record<string, unknown> = {};
      const list = Object.keys(obj);
      for (let index = 0; index < list.length; index++) {
        const key = list[index];
        ret[key] = await transform((obj as Record<string, unknown>)[key]);
      }
      return ret;
    }
    return obj.toString();
  }
  return obj;
};

export default transform;
