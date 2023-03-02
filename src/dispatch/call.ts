/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { debugWorkerPool } from '@/worker';
import { CALL_ERROR } from '@/server/error/call';
import { CallMessage, CallReplyMessage, CallErrorMessage } from '@/server/types';

/**
 * 调度简易任务
 * @returns
 */
export const dispatchCall = async (data: CallMessage): Promise<CallReplyMessage | CallErrorMessage> => {
  const event = await debugWorkerPool.runWithCall(data);
  return new Promise((resolve) => {
    event.on('message', (message: CallReplyMessage | CallErrorMessage) => {
      if (message.call === 'test-connect') {
        // @ts-ignore
        // eslint-disable-next-line no-param-reassign
        if (message.params?.password) delete message.params.password;
      }
      resolve(message);
    });
    event.on('close', () => {
      resolve({
        ...data,
        success: false,
        data: {
          message: 'Unknown error thread closed',
          code: CALL_ERROR.COMMON,
        },
      } as CallErrorMessage);
    });
  });
};
