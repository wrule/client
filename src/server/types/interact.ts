/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { Message, ErrorInfo, BaseReplyMessage } from '@/server/types/common';
import { COMMON_ERROR } from '@/server/error/common';

/**
 * Base Interact Message
 * @event interact
 * @on
 */
interface BaseInteractMessage {
}

interface ReplyInteractMessage extends BaseReplyMessage {
  success: boolean;
  event: 'interact';
}

/**
 * 查询 detail 信息
 * @event interact
 * @on
 */
export interface InteractDetailMessage extends BaseInteractMessage {
  params: {
    stepId: number;
    executeId: number;
    input: string[];
  };
}

/**
 * 错误信息
 * @event interact
 * @emit
 */
interface InteractError extends ReplyInteractMessage {
  success: false;
  data: ErrorInfo<COMMON_ERROR>;
  params: unknown;
}

export type InteractMessage = Message<InteractDetailMessage>;
export type InteractErrorMessage = Message<InteractError>
