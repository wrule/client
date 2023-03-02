/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { testConnect } from '@/core/call/test-connect';
// export { testDataSet, TestDataSetData } from '@/core/call/test-data-set';

type CF = (params: any) => any;

export const CALL_EXECUTE: Record<string, CF> = {};

export const registerCall = (key: string, func: CF): void => {
  if (CALL_EXECUTE[key]) {
    throw new Error(`conflict call ${key}`);
  }
  CALL_EXECUTE[key] = func;
};

registerCall('test-connect', testConnect);
