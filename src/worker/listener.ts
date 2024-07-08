/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */

import { ExecuteStatus, ExecuteEvents, SetGlobalVariableData, InteractAskData } from '@/core/execute';
import { EXECUTE_STATUS } from '@/core/enum';
import { WorkerTask } from '@/worker';
import {
  ExecuteStatusMessage, ExecuteDoneMessage, ExecuteErrorMessage, ExecuteExitMessage,
  ExecuteLogMessage, ExecuteProgressMessage,
} from '@/server/types';
import { EXECUTE_ERROR } from '@/server/error/execute';
import { ExecuteDoneResult } from '@/server/types/message';

export interface ExecuteSetGlobalVariableMessage {
  event: 'set-global-variable';
  data: SetGlobalVariableData;
}

export interface ExecuteInteractAskMessage {
  event: 'interact-ask';
  executeId: number;
  data: InteractAskData;
}

/**
 * create Execute listeners for message
 * @param data
 * @returns
 */
export const createExecuteListener = (data: WorkerTask): ExecuteEvents => {
  const channel = data.channel;
  const executeId = data.data.id;
  const stdout = (e: string | Uint8Array): void => {
    const msg: ExecuteLogMessage = {
      event: 'log',
      type: 'stdout',
      executeId,
      data: e,
    };
    channel.postMessage(msg);
  };
  const stderr = (e: string | Uint8Array): void => {
    const msg: ExecuteLogMessage = {
      event: 'log',
      type: 'stderr',
      executeId,
      data: e,
    };
    channel.postMessage(msg);
  };

  const error = (e: Error): void => {
    const msg: ExecuteErrorMessage = {
      event: 'error',
      executeId,
      data: {
        message: e.message,
        stack: e.stack,
        code: EXECUTE_ERROR.COMMON,
      },
    };
    channel.postMessage(msg);
  };

  const exit = (e: number): void => {
    const msg: ExecuteExitMessage = {
      event: 'exit',
      executeId,
      code: e,
    };
    channel.postMessage(msg);
  };

  const status = (e: EXECUTE_STATUS): void => {
    const msg: ExecuteStatusMessage = {
      event: 'status',
      executeId,
      data: e,
    };
    channel.postMessage(msg);
  };

  const progress = (e: ExecuteStatus): void => {
    const msg: ExecuteProgressMessage = {
      event: 'progress',
      executeId,
      data: e,
    };
    channel.postMessage(msg);
  };
  const done = (e: ExecuteDoneResult | any): void => {
    const msg: ExecuteDoneMessage = {
      event: 'done',
      executeId,
      startTime: e.startTime,
      endTime: e.endTime,
      data: e.result,
      envVariableValue: (e as any).envVariableValue,
      dataSetCountValue: e.dataSetCountValue,
    } as any;
    channel.postMessage(msg, [msg.data.buffer]);
  };

  const cancel = (e: ExecuteDoneResult): void => {
    const msg: ExecuteDoneMessage = {
      event: 'done',
      executeId,
      startTime: e.startTime,
      endTime: e.endTime,
      data: e.result,
      cancel: true,
      dataSetCountValue: e.dataSetCountValue,
    };
    channel.postMessage(msg, [msg.data.buffer]);
  };

  const close = (): void => {
    channel.close();
  };

  const setGlobalVariable = (e: SetGlobalVariableData): void => {
    const msg: ExecuteSetGlobalVariableMessage = {
      event: 'set-global-variable',
      data: e,
    };
    channel.postMessage(msg);
  };

  const interactAsk = (e: InteractAskData): void => {
    const msg: ExecuteInteractAskMessage = {
      event: 'interact-ask',
      executeId,
      data: e,
    };
    channel.postMessage(msg);
  };

  return {
    cancel,
    stdout,
    stderr,
    error,
    exit,
    status,
    progress,
    done,
    close,
    'set-global-variable': setGlobalVariable,
    'interact-ask': interactAsk,
  };
};
