/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import Logger from '@/logger';
import { VMResult } from '@/vm';
import { formatStackInfo, formatAsyncStackInfo } from '@/vm/utils';
import BaseError from '@/vm/error/base';

export default class VMError extends BaseError {
  public message!: string;
  public data!: VMResult;

  public constructor(data: VMResult, code?: string) {
    super();
    const error = data.error;
    if (error) {
      this.message = code
        ? formatAsyncStackInfo(error.name, error.message, error.stack, code)
        : formatStackInfo(error.name, error.message, error.stack);
      this.name = error.name;
    } else {
      this.name = 'VMError';
      this.message = 'Unknown error';
    }
    this.data = data;
    delete this.stack;
  }
}
