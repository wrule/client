/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import BaseController from '@/core/base';
import UnknownControllerError from '@/core/error/unknown';
import { BaseControllerData } from '@/core/types/data/index';

export default class UnknownController extends BaseController<BaseControllerData> {
  /**
   * @inheritdoc
   */
  protected async beforeExecute(): Promise<boolean> {
    return true;
  }

  /**
   * @inheritdoc
   */
  protected async afterExecute(): Promise<boolean> {
    return true;
  }

  /**
   * @inheritdoc
   */
  protected async execute(): Promise<boolean> {
    return true;
  }

  /**
   * @inheritdoc
   */
  public async action(): Promise<void> {
    this.setError(new UnknownControllerError(this.data.type));
  }
}
