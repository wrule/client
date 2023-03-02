/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { isObject, isArray } from '@/utils';

/** @see https://rollupjs.org/guide/en/#eval2--eval */
// eslint-disable-next-line no-eval
const eval2 = eval;

/**
 * command to array
 * @param str
 * @returns {string[]}
 */
export const command2Array = (str: string): string[] => {
  const string = str.trim();
  let i = 0;
  let prevChar: string | null = null;
  let char: string | null = null;
  let opening: string | null = null;
  const args: string[] = [];
  for (let idx = 0; idx < string.length; idx++) {
    prevChar = char;
    char = string.charAt(idx);
    if (char === ' ' && !opening) {
      if (!(prevChar === ' ')) {
        i++;
      }
      continue;
    }
    if (char === opening) { // right quotes
      opening = null;
      continue; // skip quotes char, not append
    } else if ((char === "'" || char === '"') && !opening) { // left quotes
      opening = char;
      continue; // skip quotes char, not append
    }
    if (!args[i]) {
      args[i] = '';
    }
    args[i] += char;
  }
  return args;
};

/**
 * toString
 * 只有断言在使用，因为会出现1000.00的特殊情况，其他时候不要使用，性能较低
 * @param value
 * @returns {string | undefined}
 */
export const toString = (value: unknown): string | undefined => {
  if (value === null) {
    return 'null';
  }
  if (value === undefined) {
    return undefined;
  }
  if (typeof value === 'number') {
    // 这里是为了处理 1000.00 转换为字符串
    return eval2(`"${value}"`);
  }
  if (isObject(value) || isArray(value)) {
    try {
      return JSON.stringify(value);
    } catch (e) {
      return value.toString();
    }
  }
  if (Buffer.isBuffer(value)) {
    return value.toString('utf-8');
  }
  return (value as any).toString();
};
