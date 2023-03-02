/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { ErrorInfo } from '@/server/types/common';

export enum DISPATCH_ERROR {
  /** 通用错误 大部分情况是编排数据错误 内部报错了 */
  COMMON = 1,
  /** 繁忙 */
  BUSY = 2,
  /** 参数非法/错误 */
  ILLEGAL = 3,
  /** 重复调度 */
  DUPLICATED = 4,
}

export const createDispatchErrorInfo = (code: DISPATCH_ERROR | Error, message?: string): ErrorInfo<DISPATCH_ERROR> => {
  if (typeof code === 'number') {
    switch (code) {
      case DISPATCH_ERROR.BUSY:
        return { message: message || 'The server is too busy, please try again later.', code: DISPATCH_ERROR.BUSY };
      case DISPATCH_ERROR.ILLEGAL:
        return { message: message || 'requestId is empty', code: DISPATCH_ERROR.ILLEGAL };
      case DISPATCH_ERROR.DUPLICATED:
        return { message: message || 'The same task is running.', code: DISPATCH_ERROR.DUPLICATED };
      // no default
    }
  } else {
    return { message: code.message, stack: code.stack, code: DISPATCH_ERROR.COMMON };
  }
  return { message: 'unknown error', code: DISPATCH_ERROR.COMMON };
};
