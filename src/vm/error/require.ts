/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import BaseError from '@/vm/error/base';

export default class RequireError extends BaseError {
  public message!: string;

  public constructor(moduleName = '') {
    super();
    this.message = `Cannot find module '${moduleName}'`;
    this.name = 'RequireError';
    delete this.stack;
  }
}
