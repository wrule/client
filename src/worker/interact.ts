/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { MessagePort } from 'node:worker_threads';
import Execute from '@/core/execute';
import { InteractMessage, InteractErrorMessage } from '@/server/types';
import { COMMON_ERROR, createCommonErrorInfo } from '@/server/error/common';
import { CONTROLLER_STATUS } from '@/core//enum';

/**
 * query interface
 * @param exec
 * @param event
 * @param channel
 */
export const interact = async (exec: Execute, event: InteractMessage, channel: MessagePort): Promise<void> => {
  const stepId = event.params.stepId !== undefined ? event.params.stepId : -1;
  const result = exec.getIndexById(stepId);
  if (!result || result.status !== CONTROLLER_STATUS.INTERACT) {
    return channel.postMessage({
      ...event,
      success: false,
      event: 'interact',
      data: createCommonErrorInfo(COMMON_ERROR.STEP_NOT_EXIST, `step [${stepId}] does not exist or status not equal interact`),
    } as InteractErrorMessage);
  }
  exec.interact({ input: event.params.input || [], stepId });
};
