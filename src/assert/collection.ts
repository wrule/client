/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { isArray } from '@/utils';
import { isCompare } from '@/assert/compare';

/**
 * 属于集合
 * @param arg0 content
 * @param arg1 collection
 */
export const isCollection = (content: unknown, collection: unknown[]): boolean => {
  const obj: unknown[] = isArray(collection) ? collection : JSON.parse(collection);
  return obj.some(((item: unknown) => isCompare(content, item)));
};
