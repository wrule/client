/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import Logger from '@/logger';
import { CONTROLLER_ERROR } from '@/core/enum';
import BaseError from '@/core/error/base';

/**
 * 未知错误
 */
export default class UnknownControllerError extends BaseError {
  public constructor(type: string | number = '-1') {
    const message = `UnknownControllerError: Unknown step or unregistered, step = ${type}`;
    super(message);
    delete this.stack;
    this.code = CONTROLLER_ERROR.SYSTEM_ERROR;
    Logger.warn(message);
  }
}
