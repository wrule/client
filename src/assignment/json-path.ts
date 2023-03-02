/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { JSONPath } from 'jsonpath-plus';
import { isObject, isArray } from '@/utils';
import { JSONPathOptions } from '@/assignment/types';

/**
 * JSON PATH assignment
 * @param {JSONPathOptions} opt
 */
export const assignmentJSONPath = (opt: JSONPathOptions): any => {
  if (opt.content === undefined || opt.path === undefined) {
    throw new Error('Content or path is empty');
  }
  const json = typeof opt.content === 'string' ? JSON.parse(opt.content) : opt.content;
  if (isObject(json) || isArray(json)) {
    const val = JSONPath({
      json,
      path: opt.path,
      wrap: false,
    });
    return val;
  }
  throw new Error('Content is not a JSON object');
};
