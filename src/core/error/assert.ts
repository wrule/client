/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { AssertResult } from '@/core/types/result/single';
import { CONTROLLER_ERROR } from '@/core/enum';
import BaseError from '@/core/error/base';
import Logger from '@/logger';
import flog from '@/utils/jmlog';
// import { ASSERT } from '@/assert';

// const slice = (arg?: string): string => {
//   if (arg !== undefined) {
//     if (arg.length > 50) return `${arg.slice(0, 50)} ... and more ${arg.length - 50} bytes`;
//     return arg;
//   }
//   return '[[undefined]]';
// };

/**
 * 断言错误
 */
export default class AssertError extends BaseError {
  public constructor(result: AssertResult[]) {
    super();
    const n = result.filter((item) => item.result === false);
    flog('[JDBC-flog]');
    this.message = `${n.length} asserts failed [JDBC]`;
    this.code = CONTROLLER_ERROR.ASSERT_ERROR;
    delete this.stack;
  }
}
