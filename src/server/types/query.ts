/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { Message, ErrorInfo, BaseReplyMessage } from '@/server/types/common';
import { COMMON_ERROR } from '@/server/error/common';

/**
 * index = 查询某个执行的列表以及进度等信息
 * detail = 查询某个执行的所有详细信息（不要使用，很消耗性能）
 * step = 查询某个执行中某一个步骤的详细信息
 */
type Query = 'index' | 'detail' | 'step';

/**
 * Base Query Message
 * @event query
 * @on
 */
interface BaseQueryMessage {
  query: Query;
}

interface ReplyQueryMessage extends BaseReplyMessage {
  event: 'query';
  query: Query;
}

/**
 * 查询 detail 信息
 * @event query
 * @on
 */
export interface QueryDetailMessage extends BaseQueryMessage {
  query: 'detail';
  params: {
    executeId: number;
  };
}

/**
 * 返回 detail 信息
 * @event query
 * @emit
 */
export interface ReplyDetailMessage extends ReplyQueryMessage {
  query: 'detail';
  success: true;
  params: {
    executeId: number;
  };
  data: Buffer;
}

/**
 * 查询 detail step 信息
 * @event query
 * @on
 */
export interface QueryDetailStepMessage extends BaseQueryMessage {
  query: 'step';
  params: {
    executeId: number;
    stepId: number;
  };
}

/**
 * 返回 detail step 信息
 * @event query
 * @emit
 */
export interface ReplyDetailStepMessage extends ReplyQueryMessage {
  query: 'step';
  success: true;
  data: Buffer;
  params: {
    executeId: number;
    stepId: number;
  };
}

/**
 * 错误信息
 * @event query
 * @emit
 */
interface QueryError extends ReplyQueryMessage {
  query: Query;
  success: false;
  data: ErrorInfo<COMMON_ERROR>;
  params: unknown;
}

export type QueryMessage = Message<QueryDetailMessage> | Message<QueryDetailStepMessage>;
export type QueryReplyMessage = Message<ReplyDetailMessage> | Message<ReplyDetailStepMessage>;
export type QueryErrorMessage = Message<QueryError>
