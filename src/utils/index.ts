/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { version } from '../../package.json';

/**
 * rollup replace
 */
export const isDeveloper = process.env.NODE_ENV !== 'production';

export const ENGINE_VERSION = version;
export const ENGINE_BUILD_TIME = Number(process.env.BUILD_TIME);
export const ENGINE_VERSION_UINT = (() => {
  const [major, minor, patch] = ENGINE_VERSION.split('.');
  return ((Number(major) & 0xff) << 16) | ((Number(minor) & 0xff) << 8) | (Number(patch) & 0xff);
})();

// simple, used in non-strict scenarios
export const isString = (o: unknown): o is string => typeof o === 'string';
export const isNumber = (o: unknown): o is number => typeof o === 'number';
/**
 * 非常严格的判断 这个判断是有针对性的 不要轻易修改 影响全局
 * 改之前一定要问我为什么这么写 root@williamchan.me
 * @param o
 * @returns {boolean}
 */
export const isObject = (o: unknown): o is Record<string, unknown> => {
  if (o !== undefined && typeof o === 'object' && o !== null) {
    // 有 Object.create(null) 创建的情况
    if (o.constructor === undefined) {
      return true;
    }
    // 过滤掉例如 ObjectId 调用 toString 被误判为 [object Object]
    if (o.constructor.name === 'Object') {
      // 因为VM中 Object 并不是下方的 Object 所以需要兜底 call toString
      return o.constructor === Object || Object.prototype.toString.call(o) === '[object Object]';
    }
  }
  return false;
};
export const isArray = (o: unknown): o is any[] => Array.isArray(o);
export const isBoolean = (o: unknown): o is boolean => typeof o === 'boolean';
export const isNull = (o: unknown): o is null => o === null;
export const isUndefined = (o: unknown): o is undefined => o === undefined;
export const isNullOrUndefined = (val: unknown): boolean => val === undefined || val === null;

/**
 * Async function that resolves after `ms` milliseconds
 * @param ms - number of milliseconds to sleep for
 */
// eslint-disable-next-line no-promise-executor-return
export const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));
