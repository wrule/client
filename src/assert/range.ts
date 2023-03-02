/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { bigNumber } from '@/utils/number';
import { isArray } from '@/utils';

/**
 * isRange
 * @param content
 * @param range
 */
export const isRange = (content: unknown, range: [unknown, unknown] | string): boolean => {
  const obj = isArray(range) ? range : JSON.parse(range);
  if (obj.length === 2) {
    const num = bigNumber(content);
    const r0 = bigNumber(obj[0]);
    const r1 = bigNumber(obj[1]);
    const order = r0.lt(r1);
    if (order) {
      return num.gte(r0) && num.lte(r1);
    }
    return num.gte(r1) && num.lte(r0);
  }
  throw new Error('Invalid range');
};
