/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import Decimal from 'decimal.js';

/**
 * 转换为 bigNumber
 * @param val
 * @returns
 */
export const bigNumber = (val: unknown): Decimal => {
  if (typeof val === 'string' || typeof val === 'number') {
    return new Decimal(val);
  }
  if (typeof val === 'bigint') {
    return new Decimal(val.toString());
  }
  throw new Error('Invalid value');
};
