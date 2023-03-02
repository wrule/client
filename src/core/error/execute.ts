/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { CONTROLLER_ERROR } from '@/core/enum';
import BaseError from '@/core/error/base';
import Logger from '@/logger';
import { isDeveloper } from '@/utils';

interface ErrorData {
  message: string;
  stack?: string;
  name?: string;
}

/**
 * 执行错误
 */
export default class ExecuteError extends BaseError {
  public constructor(message: string | Error | ErrorData, stack?: string) {
    super();
    if (isDeveloper) {
      Logger.debug(message);
    }
    if (typeof message === 'string') {
      this.message = `ExecuteError: ${message}`;
    } else if (message.name) {
      this.message = `${message.name}: ${message.message}`;
    } else {
      this.message = message.message;
    }
    this.code = CONTROLLER_ERROR.EXECUTE_ERROR;
    // 没什么意义 留着吧
    this.stack = stack;
  }
}
