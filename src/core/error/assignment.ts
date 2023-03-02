/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { CONTROLLER_ERROR } from '@/core/enum';
import BaseError from '@/core/error/base';

/**
 * 提取出错
 * 一般不会有 比如正则写错之类的吧
 */
export default class AssignmentError extends BaseError {
  public constructor(index: number) {
    super(`AssignmentError: Assignment [${index}] error, please check it.`);
    this.code = CONTROLLER_ERROR.ASSIGNMENT_ERROR;
    delete this.stack;
    // logger.warn(message);
  }
}
