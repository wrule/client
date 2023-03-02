/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { ErrorInfo } from '@/server/types/common';

export enum COMMON_ERROR {
  /**
   * 部分内容目前属于通用错误 直接报错即可
   * 由于是异步跨线程查询 暂时不做太细
   * 业务上应该暂时不需要那么细
   */
  COMMON = 1,
  /** 调度任务不存在 这种情况多半是执行完了 */
  REQUEST_ID_NOT_EXIST = 2,
  /** 参数非法/错误 */
  ILLEGAL = 3,
  /** 建议前端遇到这个错误做兜底查询本地处理 如果还是查不到再报出来 */
  STEP_NOT_EXIST = 4,
}

export const createCommonErrorInfo = (code: COMMON_ERROR | Error, message?: string): ErrorInfo<COMMON_ERROR> => {
  if (typeof code === 'number') {
    switch (code) {
      case COMMON_ERROR.ILLEGAL:
        return { message: message || 'Missing or illegal parameters', code: COMMON_ERROR.ILLEGAL };
      case COMMON_ERROR.REQUEST_ID_NOT_EXIST:
        return { message: message || 'requestId does not exist.', code: COMMON_ERROR.REQUEST_ID_NOT_EXIST };
      case COMMON_ERROR.STEP_NOT_EXIST:
        return { message: message || 'step does not exist', code: COMMON_ERROR.STEP_NOT_EXIST };
       // no default
    }
  } else {
    return { message: code.message, stack: code.stack, code: COMMON_ERROR.COMMON };
  }
  return { message: 'unknown error', code: COMMON_ERROR.COMMON };
};
