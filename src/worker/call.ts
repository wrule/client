/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { CallTask } from '@/worker';
import { createCallErrorInfo } from '@/server/error/call';
import { CallErrorMessage, BaseReplyCallMessage } from '@/server/types';
import { CALL_EXECUTE } from '@/core/call';

/**
 * 简易 call 执行器
 * @param {CallTask} event
 */
export const executeCall = async (event: CallTask): Promise<void> => {
  try {
    const func = CALL_EXECUTE[event.data.call];
    if (func) {
      const data = await func(event.data.params);
      return event.channel.postMessage({
        ...event.data,
        success: true,
        data,
      } as BaseReplyCallMessage);
    }
    throw new Error('Unknown call');
  } catch (err) {
    // const data = await
    event.channel.postMessage({
      ...event.data,
      success: false,
      data: createCallErrorInfo(err),
    } as CallErrorMessage);
  }
};
// event.channel.postMessage(msg);
