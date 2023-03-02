/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */

import get from 'lodash/get';
import { isObject, isArray } from '@/utils';
import { JSONParseRecursion } from '@/utils/json';
import { JSONOptions } from '@/assignment/types';

/**
 * JSON assignment
 * @param {JSONOptions} opt
 */
export const assignmentJSON = (opt: JSONOptions): any => {
  if (opt.content === undefined || opt.path === undefined) {
    throw new Error('Content or path is empty');
  }
  let json = opt.content;
  if (opt.recursion) {
    json = JSONParseRecursion(opt.content);
  } else if (typeof opt.content === 'string') {
    json = JSON.parse(opt.content);
  }

  if (isObject(json) || isArray(json)) {
    const val = get(json, opt.path);
    return val;
  }
  throw new Error('Content is not a JSON object');
};
