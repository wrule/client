/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { DataSetDetailResult } from '@plugin/data-set/types/result';
import { Message, ErrorInfo } from '@/server/types/common';
import { CALL_ERROR } from '@/server/error/call';
import { DataSource } from '@/dispatch/types/data-source';

import { TestDataSetData } from '@plugin/data-set/call';

/**
 * 提供五种 Call
 */
type Call =
  'test-connect' |
  'test-dataset';
  // 'test-component' | // 这个不提供 当步骤执行吧

/**
 * Base Call Message
 * @event call
 * @on
 */
interface BaseCallMessage {
  call: Call;
}

export interface BaseReplyCallMessage {
  call: Call;
  success: boolean;
  data: unknown;
}

/**
 * 测试数据源连通性
 * @event call
 * @on
 */
export interface CallTestConnectMessage extends BaseCallMessage {
  call: 'test-connect';
  params: DataSource;
}

/**
 * 返回数据源连通性
 * @event call
 * @emit
 */
export interface ReplyTestConnectMessage extends BaseReplyCallMessage {
  call: 'test-connect';
  success: true;
  data: {
    version: string;
  };
}

/**
 * 查询 detail step 信息
 * @event call
 * @on
 */
export interface CallTestDataSetMessage extends BaseCallMessage {
  call: 'test-dataset';
  params: TestDataSetData;
}

/**
 * 返回 detail step 信息
 * @event call
 * @emit
 */
export interface ReplyTestDataSetMessage extends BaseReplyCallMessage {
  call: 'test-dataset';
  success: true;
  data: DataSetDetailResult;
}

/**
 * 错误信息
 * @event call
 * @emit
 */
interface CallError extends BaseReplyCallMessage {
  call: Call;
  success: false;
  data: ErrorInfo<CALL_ERROR>;
}

export type CallMessage = Message<CallTestConnectMessage> | Message<CallTestDataSetMessage>;
export type CallReplyMessage = Message<ReplyTestConnectMessage> | Message<ReplyTestDataSetMessage>;
export type CallErrorMessage = Message<CallError>
