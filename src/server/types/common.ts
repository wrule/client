/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
export interface ErrorInfo<T> {
  message: string;
  stack?: string;
  /** 错误码 */
  code: T;
}

/**
 * 基础事件 所有事件都基于此包装
 * @see https://github.com/microsoft/TypeScript/issues/2225
 */
export type Message<T> = T & {
  /** 调度ID */
  requestId: string;
  // /** 扩展信息 原样回传 */
  // extra?: unknown;
};

export interface BaseReplyMessage {
  event: string;
  success: boolean;
}
