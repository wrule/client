/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { ErrorInfo } from '@/server/types/common';

export enum CALL_ERROR {
  /** 通用错误 大部分情况是编排数据错误 内部报错了 */
  COMMON = 1,
  /** 繁忙 */
  BUSY = 2,
  /** 参数非法/错误 */
  ILLEGAL = 3,
  /** 重复调度 */
  DUPLICATED = 4,
}

export const createCallErrorInfo = (code: CALL_ERROR | Error, message?: string): ErrorInfo<CALL_ERROR> => {
  if (typeof code === 'number') {
    switch (code) {
      case CALL_ERROR.BUSY:
        return { message: message || 'The server is too busy, please try again later.', code: CALL_ERROR.BUSY };
      case CALL_ERROR.ILLEGAL:
        return { message: message || 'requestId is empty', code: CALL_ERROR.ILLEGAL };
      case CALL_ERROR.DUPLICATED:
        return { message: message || 'The same task is running.', code: CALL_ERROR.DUPLICATED };
      // no default
    }
  } else {
    return { message: code.message, stack: code.stack, code: CALL_ERROR.COMMON };
  }
  return { message: 'unknown error', code: CALL_ERROR.COMMON };
};
