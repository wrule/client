/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import BaseError from '@/vm/error/base';

export default class TimeoutError extends BaseError {
  public constructor(timeout: string | number) {
    super();
    this.message = `Script Execution timed out after ${timeout}ms`;
    this.name = 'TimeoutError';
    delete this.stack;
  }
}
