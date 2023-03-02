/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { CONTROLLER_ERROR } from '@/core/enum';
import BaseError from '@/core/error/base';

/**
 * 响应错误 HTTP 4XX dubbo exception
 */
export default class ResponseError extends BaseError {
  public constructor(message: string, stack?: string) {
    super(`ResponseError: ${message}`);
    this.code = CONTROLLER_ERROR.RESPONSE_ERROR;
    this.stack = stack;
  }
}
