/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import BaseError from '@/core/error/base';
import { CONTROLLER_ERROR } from '@/core/enum';

/**
 * 组合步骤子步骤错误
 */
export default class CombinationError extends BaseError {
  public constructor(index: number[] | number) {
    super(`Error: Step index [${index.toString()}] error`);
    this.code = CONTROLLER_ERROR.COMBINATION_ERROR;
    if (Array.isArray(index)) {
      this.extra = index;
    } else {
      this.extra = [index];
    }
    delete this.stack;

    // logger.warn(message);
  }
}
