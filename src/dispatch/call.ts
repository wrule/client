/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { debugWorkerPool } from '@/worker';
import { CALL_ERROR } from '@/server/error/call';
import { CallMessage, CallReplyMessage, CallErrorMessage } from '@/server/types';
import Logger from '@/logger';

/**
 * 调度简易任务
 * @returns
 */
export const dispatchCall = async (data: CallMessage): Promise<CallReplyMessage | CallErrorMessage> => {
  Logger.info('[JDBC-dd-1]', JSON.stringify(data));
  const event = await debugWorkerPool.runWithCall(data);
  return new Promise((resolve) => {
    event.on('message', (message: CallReplyMessage | CallErrorMessage) => {
      if (message.call === 'test-connect') {
        // @ts-ignore
        // eslint-disable-next-line no-param-reassign
        if (message.params?.password) delete message.params.password;
      }
      Logger.info('[JDBC-dd-2]', JSON.stringify(message));
      resolve(message);
    });
    event.on('close', () => {
      Logger.info('[JDBC-dd-3]', JSON.stringify(data));
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
