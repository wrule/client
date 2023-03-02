/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
// string compare
// object compare
import { JSONParseRecursion } from '@/utils/json';
import { isObject, isArray } from '@/utils';
import { toString } from '@/utils/string';

/**
 * 字符串比较
 * @param a
 * @param b
 */
export const isCompare = (a: unknown, b: unknown): boolean => toString(a) === toString(b);

function compareObject(arg0: unknown, arg1: unknown): boolean {
  if (isObject(arg0) && isObject(arg1)) {
    const arr0 = Object.keys(arg0);
    if (arr0.length !== Object.keys(arg1).length) {
      return false;
    }
    return arr0.every((key) => compareObject(arg0[key], arg1[key]));
  } if (isArray(arg0) && isArray(arg1)) {
    if (arg0.length !== arg1.length) {
      return false;
    }
    return arg0.every((_, index) => compareObject(arg0[index], arg1[index]));
  }
  return arg0 === arg1;
}

/**
 * 对象比较
 * @param a
 * @param b
 */
export const isCompareObject = (a: string, b: string): boolean => {
  const json0 = JSONParseRecursion(a);
  const json1 = JSONParseRecursion(b);
  const ret = compareObject(json0, json1);
  return ret;
};
