/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */

import { bigNumber } from '@/utils/number';

/**
 * isGreaterThan
 * @param content
 * @param value
 */
export const isGreaterThan = (content: number, value: number): boolean => {
  const arg0 = bigNumber(content);
  const arg1 = bigNumber(value);
  return arg0.gt(arg1);
};

/**
 * isLessThan
 * @param content
 * @param value
 */
export const isLessThan = (content: number, value: number): boolean => {
  const arg0 = bigNumber(content);
  const arg1 = bigNumber(value);
  return arg0.lt(arg1);
};

/**
 * isGreaterThanOrEqual
 * @param content
 * @param value
 */
export const isGreaterThanOrEqual = (content: number, value: number): boolean => {
  const arg0 = bigNumber(content);
  const arg1 = bigNumber(value);
  return arg0.gte(arg1);
};
/**
 * isLessThanOrEqual
 * @param content content
 * @param value
 */
export const isLessThanOrEqual = (content: number, value: number): boolean => {
  const arg0 = bigNumber(content);
  const arg1 = bigNumber(value);
  return arg0.lte(arg1);
};
