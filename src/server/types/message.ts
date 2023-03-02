/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { ExecuteStatus } from '@/core/execute';
import { Message, ErrorInfo } from '@/server/types/common';
import { EXECUTE_STATUS } from '@/core/enum/index';
import { EXECUTE_ERROR } from '@/server/error/execute';
/**
 * 单用例状态变更事件
 * 例如从等待到完成（此事件不包含详细记录）
 * @event message
 * @emit
 */
export interface ExecuteStatusMessage {
  event: 'status';
  executeId: number;
  data: EXECUTE_STATUS;
  retry?: number;
}

/**
 * 单用例状态变更事件
 * 只有指定了 progress 才会发起该事件
 * @event message
 * @emit
 */
export interface ExecuteProgressMessage {
  event: 'progress';
  executeId: number;
  data: ExecuteStatus;
  retry?: number;
}

/**
 * 用例日志
 * 只有指定了 stdout/stderr 才会发起该事件
 * @event message
 * @emit
 */
export interface ExecuteLogMessage {
  event: 'log';
  type: 'stdout' | 'stderr';
  executeId: number;
  data: string | Uint8Array;
  retry?: number;
}

/**
 * 单用例执行线程意外退出（主进程未退出）
 * 如果OOM 数据已丢失 不会有任何结果返回
 * 这种情况一般很少出现 除非在预处理中 主动关闭线程
 * @event message
 * @emit
 */
export interface ExecuteExitMessage {
  event: 'exit';
  executeId: number;
  /** exit code */
  code: number;
  // data?: ExecuteResult;
  retry?: number;
}

/**
 * 单用例执行中遇到的错误 这种情况一般很少出现
 * 这种错误是没捕捉到的一些异常，可以记录用于分析
 * 用例本身失败不会触发这个事件
 * @event message
 * @emit
 */
export interface ExecuteErrorMessage {
  event: 'error';
  executeId: number;
  data: ErrorInfo<EXECUTE_ERROR>;
  retry?: number;
}

/**
 * 单用例完成后的事件
 * @event message
 * @emit
 */
export interface ExecuteDoneMessage {
  event: 'done';
  executeId: number;
  data: Buffer;
  retry?: number;
  cancel?: boolean;
}

export type ExecuteMessageData =
  ExecuteStatusMessage |
  ExecuteExitMessage |
  ExecuteDoneMessage |
  ExecuteProgressMessage |
  ExecuteLogMessage

export type ExecuteMessageEvent =
  Message<ExecuteStatusMessage> |
  Message<ExecuteExitMessage> |
  Message<ExecuteDoneMessage> |
  Message<ExecuteProgressMessage> |
  Message<ExecuteLogMessage>
