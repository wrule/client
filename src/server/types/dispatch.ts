/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { DispatchData, ExecuteStatusCollection } from '@/dispatch';
import { ErrorInfo, Message } from '@/server/types/common';
import { DISPATCH_ERROR } from '@/server/error/dispatch';

/**
 * 执行调度
 * @event dispatch
 * @on
 */
export type DispatchMessage = Message<{
  data: DispatchData;
  debug?: boolean;
}>

/**
 * 调度成功
 * @event dispatch
 * @emit
 */
export type DispatchSuccessMessage = Message<{
  event: 'success';
}>

/**
 * 调度失败
 * @event dispatch
 * @emit
 */
export type DispatchErrorMessage = Message<{
  event: 'error';
  data: ErrorInfo<DISPATCH_ERROR>;
}>

/**
 * 调度完成后的事件
 * @event dispatch
 * @emit
 */
export type DispatchDoneMessage = Message<{
  event: 'done';
  /**
   * 执行的状态合集
   * 可以用这个数据来修正最后的异常情况
   * 比如突然退出等 一般情况下异常退出的用例最后一次状态 会保持在执行中
   */
  data: ExecuteStatusCollection;
}>
