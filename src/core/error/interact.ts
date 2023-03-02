/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { CONTROLLER_ERROR } from '@/core/enum';
import BaseError from '@/core/error/base';

/**
 * 交互失败
 * @enum INTERACT_ERROR
 * @example 用户主动点击未完成 用于 confirm
 */
export default class InteractError extends BaseError {
  public constructor(message: string) {
    super(`InteractError: ${message}`);
    this.code = CONTROLLER_ERROR.INTERACT_ERROR;
    delete this.stack;
  }
}
