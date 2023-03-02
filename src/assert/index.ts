/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */

// For GUI
import { isCompare, isCompareObject } from '@/assert/compare';
import { isExist } from '@/assert/exist';
import { isInclude } from '@/assert/include';
import { isCollection } from '@/assert/collection';
import { isGreaterThan, isLessThan, isGreaterThanOrEqual, isLessThanOrEqual } from '@/assert/operator';
import { isRange } from '@/assert/range';

export { isCompare, isCompareObject } from '@/assert/compare';
export { isExist } from '@/assert/exist';
export { isInclude } from '@/assert/include';
export { isCollection } from '@/assert/collection';
export { isGreaterThan, isLessThan, isGreaterThanOrEqual, isLessThanOrEqual } from '@/assert/operator';
export { isRange } from '@/assert/range';

export enum ASSERT {
  COMPARE = 0, // 等于
  NOT_COMPARE = 1, // 不等于
  COMPARE_OBJECT = 2, // 对象比较
  EXIST = 3, // 存在
  NOT_EXIST = 4, // 不存在
  INCLUDE = 5, // 包含
  NOT_INCLUDE = 6, // 不包含
  COLLECTION = 7, // 属于合集
  NOT_COLLECTION = 8, // 不属于合集
  GREATER_THAN = 9, // 大于
  LESS_THAN = 10, // 小于
  GREATER_THAN_OR_EQUAL = 11, // 大于等于
  LESS_THAN_OR_EQUAL = 12, // 小于等于
  RANGE = 13, // 区间范围
  NOT_RANGE = 14, // 不属于区间范围
}

export const ASSERT_FUNCTION = {
  [ASSERT.COMPARE]: isCompare,
  [ASSERT.NOT_COMPARE]: (a: string, b: string): boolean => !isCompare(a, b),
  [ASSERT.COMPARE_OBJECT]: isCompareObject,
  [ASSERT.EXIST]: isExist,
  [ASSERT.NOT_EXIST]: (arg: unknown): boolean => !isExist(arg),
  [ASSERT.INCLUDE]: isInclude,
  [ASSERT.NOT_INCLUDE]: (content: string, searchValue: string): boolean => !isInclude(content, searchValue),
  [ASSERT.COLLECTION]: isCollection,
  [ASSERT.NOT_COLLECTION]: (content: unknown, collection: unknown[]): boolean => !isCollection(content, collection),
  [ASSERT.GREATER_THAN]: isGreaterThan,
  [ASSERT.LESS_THAN]: isLessThan,
  [ASSERT.GREATER_THAN_OR_EQUAL]: isGreaterThanOrEqual,
  [ASSERT.LESS_THAN_OR_EQUAL]: isLessThanOrEqual,
  [ASSERT.RANGE]: isRange,
  [ASSERT.NOT_RANGE]: (content: string, range: [unknown, unknown] | string): boolean => !isRange(content, range),
};
