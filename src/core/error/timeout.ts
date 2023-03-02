/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { CONTROLLER_ERROR } from '@/core/enum';
import BaseError from '@/core/error/base';

/**
 * 步骤中部分内容超时
 */
export default class TimeoutError extends BaseError {
  public constructor(timeout: string | number) {
    super();
    if (typeof timeout === 'string') {
      this.message = timeout;
    } else {
      this.message = `Execution timed out after ${timeout}ms`;
    }
    this.name = 'TimeoutError';
    this.code = CONTROLLER_ERROR.EXECUTE_ERROR;
    delete this.stack;
  }
}
