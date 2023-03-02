/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { RegExpOptions } from '@/assignment/types';
import { toString } from '@/utils/string';

/**
 * RegExp assignment
 * @param {RegExpOptions} opt
 */
export const assignmentRegExp = (opt: RegExpOptions): void | string | string[] => {
  const str = toString(opt.content);
  if (!str || !opt.exp) {
    throw new Error('Content or pattern is empty');
  }
  const pattern = new RegExp(opt.exp, opt.flags);
  const index = Number(opt.index ? opt.index : 0);
  if (pattern.global) {
    // matchAll
    const matches = str.matchAll(pattern);
    const result: string[] = [];
    // eslint-disable-next-line no-restricted-syntax
    for (const match of matches) {
      if (match[index] === undefined) {
        result.push(match[0]);
      } else {
        result.push(match[index]);
      }
    }
    return result;
  }
  const ret = str.match(pattern);
  if (ret) {
    if (ret[index] !== undefined) {
      return ret[index];
    }
  }
};
