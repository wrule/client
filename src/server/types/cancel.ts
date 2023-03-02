/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */

/**
 * 取消执行
 * @event cancel
 * @on
 */
export interface CancelMessage {
  requestId: string;
  /** 不填取消整个调度 */
  params?: {
    executeId: number | number[];
  };
}
