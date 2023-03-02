/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import get from 'lodash/get';
import cheerio from 'cheerio';
import { HTMLOptions } from '@/assignment/types';

/**
 * HTML assignment
 * @param {HTMLOptions} opt
 */
export const assignmentHTML = (opt: HTMLOptions): any => {
  if (opt.content === undefined || opt.path === undefined) {
    throw new Error('Content or path is empty');
  }
  const $ = cheerio.load(opt.content);
  const obj = $(opt.path);
  if (obj.length > 0) {
    const fn = get(obj, opt.expression[0]);
    if (typeof fn === 'function') {
      const val = fn.call(obj, ...[...opt.expression].slice(1));
      return val;
    }
  }
};
