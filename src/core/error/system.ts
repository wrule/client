/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import Logger from '@/logger';
import { CONTROLLER_ERROR } from '@/core/enum';
import BaseError from '@/core/error/base';

/**
 * 系统错误
 */
export default class SystemError extends BaseError {
  public constructor(message: string | Error) {
    super();
    if (typeof message === 'string') {
      this.message = `SystemError: ${message}`;
    } else {
      this.message = `${message.name === 'Error' ? 'SystemError' : message.name}: ${message.message}`;
    }
    Logger.debug(this.stack);
    delete this.stack;
    this.code = CONTROLLER_ERROR.SYSTEM_ERROR;
  }
}
