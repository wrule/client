/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { CONTROLLER_ERROR } from '@/core/enum';
import BaseError from '@/core/error/base';

/**
 * 预处理错误
 */
export default class PostScriptError extends BaseError {
  public constructor(index: number, message?: string) {
    super();
    this.code = CONTROLLER_ERROR.POST_ERROR;
    if (message) {
      this.message = message;
    } else {
      this.message = `Post Script [${index}] Error`;
    }
    delete this.stack;
  }
}
