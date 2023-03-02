/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
/* eslint @typescript-eslint/no-use-before-define: ["error", { "functions": false }] */
import { isObject, isString, isArray } from '@/utils';

function JSONParse(json: any): any {
  try {
    const o = JSON.parse(json);
    if (isObject(o) || isArray(o) || (isString(o) && o !== json)) {
      return JSONParseRecursion(o);
    }
  } catch (e) {
    if (e.message.indexOf('token \\ in JSON')) {
      const str = json.replace(/\\\\/g, '\\').replace(/\\"/g, '"');
      if (str !== json) {
        return JSONParse(str);
      }
    }
  }
  return json;
}

/**
 * 对 JSON 进行递归 parse 处理
 * @param obj
 * @returns
 */
export function JSONParseRecursion(obj: unknown): any {
  if (isObject(obj)) {
    const o: Record<string, unknown> = {};
    Object.keys(obj).forEach((key) => {
      o[key] = JSONParseRecursion(obj[key]);
    });
    return o;
  }

  if (isArray(obj)) {
    return obj.map((_, index) => JSONParseRecursion(obj[index]));
  }
  if (isString(obj)) {
    const ret = JSONParse(obj);
    if (isObject(ret) || isArray(ret)) {
      return JSONParseRecursion(ret);
    }
  }
  return obj;
}
