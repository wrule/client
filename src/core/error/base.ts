/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { CONTROLLER_ERROR } from '@/core/enum';

export default class BaseError extends Error {
  public code!: CONTROLLER_ERROR;
  public extra!: unknown;
}
