/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { MessagePort } from 'node:worker_threads';
import Execute from '@/core/execute';
import transform from '@/utils/serialize';
import { encodeBrotli } from '@/utils/zlib';
import {
  QueryMessage, QueryErrorMessage, ReplyDetailMessage, ReplyDetailStepMessage,
} from '@/server/types';
import { COMMON_ERROR, createCommonErrorInfo } from '@/server/error/common';

/**
 * query interface
 * @param exec
 * @param event
 * @param channel
 */
export const query = async (exec: Execute, event: QueryMessage, channel: MessagePort): Promise<void> => {
  switch (event.query) {
    case 'detail': {
      const data = await exec.build();
      return channel.postMessage({ ...event, event: 'query', success: true, data } as ReplyDetailMessage, [data.buffer]);
    }
    case 'step': {
      const data = exec.getDetailById(event.params.stepId);
      if (data) {
        try {
          const string = JSON.stringify(await transform(data));
          const buffer = await encodeBrotli(string);
          return channel.postMessage({ ...event, event: 'query', success: true, data: buffer } as ReplyDetailStepMessage);
        } catch (e) {
          return channel.postMessage({
            ...event,
            success: false,
            event: 'query',
            data: createCommonErrorInfo(e),
          } as QueryErrorMessage);
        }
      } else {
        const stepId = event.params?.stepId !== undefined ? event.params.stepId : 'unknown';
        return channel.postMessage({
          ...event,
          success: false,
          event: 'query',
          data: createCommonErrorInfo(COMMON_ERROR.STEP_NOT_EXIST, `step [${stepId}] does not exist`),
        } as QueryErrorMessage);
      }
    }
      // no default
  }
};
