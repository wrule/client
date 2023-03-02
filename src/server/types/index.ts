/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { QueryMessage, QueryReplyMessage, QueryErrorMessage } from '@/server/types/query';
import { InteractMessage, InteractErrorMessage } from '@/server/types/interact';

export { Message } from '@/server/types/common';

export {
  DispatchMessage,
  DispatchSuccessMessage,
  DispatchErrorMessage,
  DispatchDoneMessage,
} from '@/server/types/dispatch';

export {
  ExecuteStatusMessage,
  ExecuteExitMessage,
  ExecuteDoneMessage,
  ExecuteProgressMessage,
  ExecuteLogMessage,
  ExecuteErrorMessage,
  ExecuteMessageData,
  ExecuteMessageEvent,
} from '@/server/types/message';

export {
  ReplyDetailMessage,
  ReplyDetailStepMessage,
  QueryMessage,
  QueryReplyMessage,
  QueryErrorMessage,
} from '@/server/types/query';

export {
  InteractMessage,
  InteractErrorMessage,
} from '@/server/types/interact';

export {
  CancelMessage,
} from '@/server/types/cancel';

export {
  CallMessage,
  CallReplyMessage,
  CallErrorMessage,
  ReplyTestConnectMessage,
  ReplyTestDataSetMessage,
  BaseReplyCallMessage,
} from '@/server/types/call';

export type ReplyMessage = QueryReplyMessage | QueryErrorMessage | InteractErrorMessage
export type ReplyErrorMessage = QueryErrorMessage | InteractErrorMessage
export type MessageEvent = QueryMessage | InteractMessage
