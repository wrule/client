/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { performance } from 'node:perf_hooks';
import { Socket } from 'socket.io';
import Logger from '@/logger';
import Dispatch, { ExecuteStatusCollection, ExecuteInteractAskMessage } from '@/dispatch';
import {
  ReplyMessage, ReplyErrorMessage,
  ExecuteMessageData, ExecuteMessageEvent,
  DispatchMessage, DispatchDoneMessage, DispatchErrorMessage, DispatchSuccessMessage,
  QueryMessage,
  InteractMessage,
  CancelMessage,
  CallMessage, CallErrorMessage,
  MessageEvent,
} from '@/server/types';
import { Config, reload, CONFIG } from '@/config';
import { getSystemInfo, isBusy, setQueueCounter } from '@/utils/info';
import { isObject } from '@/utils';
import { downloadContent } from '@/utils/file';
import { DISPATCH_ERROR, createDispatchErrorInfo } from '@/server/error/dispatch';
import { COMMON_ERROR, createCommonErrorInfo } from '@/server/error/common';
import { CALL_ERROR, createCallErrorInfo } from '@/server/error/call';
import { dispatchCall } from '@/dispatch//call';
import { DispatchStat } from '@/dispatch/types';

export interface DispatchTask {
  [key: string]: Dispatch;
}

export interface OnlineClient {
  [key: string]: ClientEvent;
}

export interface Context {
  readonly dispatch: DispatchTask;
  readonly online: OnlineClient;
}

/**
 * User Client Interface
 */
export default class ClientEvent {
  private readonly context!: Context;
  private readonly client!: Socket;

  /**
   * constructor
   * @param client
   * @param context
   */
  public constructor(client: Socket, context: Context) {
    this.client = client;
    this.context = context;
    this.context.online[client.id] = this;
    Logger.info('[socket] client %s connected, ip=%s', client.id, client.handshake.address);
    client.on('disconnect', () => this.onDisconnect());
    client.on('dispatch', (e: DispatchMessage) => this.onDispatch(e));
    client.on('call', (e: CallMessage) => {
      this.onCall(e);
    });
    client.on('cancel', (e: CancelMessage) => this.onCancel(e));
    client.on('query', (e: QueryMessage) => this.onMessageEvent('query', e));
    client.on('interact', (e: InteractMessage) => this.onMessageEvent('interact', e));
    client.on('info', () => {
      const info = getSystemInfo();
      client.emit('info', info);
      // Logger.info('[info] client %s, ip=%s, data=%s', client.id, client.handshake.address, JSON.stringify(info));
    });
    client.on('stat', () => {
      const stat: Record<string, DispatchStat> = {};
      Object.keys(this.context.dispatch).forEach((key) => {
        const instance = this.context.dispatch[key];
        if (instance) {
          stat[key] = instance.stat();
        }
      });
      client.emit('stat', stat);
    });
    client.on('config', (config?: Config) => {
      if (config) {
        reload(config);
        Logger.info(`[config] reload config success ${JSON.stringify(config)}`);
      } else {
        client.emit('config', CONFIG);
      }
    });
    client.emit('info', getSystemInfo());
  }

  /**
   * disconnect event
   * @param e
   */
  private onDisconnect(): void {
    Logger.info('[socket] client %s disconnected', this.client.id);
    this.client.removeAllListeners();
    delete this.context.online[this.client.id];
  }

  /**
   * dispatch event
   * @param event
   */
  public async onDispatch(event: DispatchMessage): Promise<void> {
    if (!isObject(event)) return;
    const requestId = event.requestId;
    if (!requestId) {
      return this.sendDispatchError(event, DISPATCH_ERROR.ILLEGAL);
    }
    if (this.context.dispatch[requestId]) {
      return this.sendDispatchError(event, DISPATCH_ERROR.DUPLICATED);
    }
    try {
      if (isBusy()) {
        // if (isBusy() && !event.debug) {
        return this.sendDispatchError(event, DISPATCH_ERROR.BUSY);
      }
      let buffer!: Buffer;
      if (typeof event.data === 'string') {
        try {
          const now = performance.now();
          Logger.info(`[dispatch] downloading dispatch data from ${event.data}`);
          buffer = await downloadContent(event.data);
          Logger.info(`[dispatch] download dispatch data from ${event.data} done, cost ${performance.now() - now}ms`);
        } catch (e) {
          const err = new Error(`download dispatch data from ${event.data} failed, ${e.message}`);
          delete err.stack;
          throw err;
        }
      }
      const content = buffer || event.data;
      const instance = await Dispatch.create(content, event.requestId);
      this.context.dispatch[requestId] = instance;
      // 执行线程发送的内容 主动推送
      instance.on('message', (data: ExecuteMessageData) => {
        this.client.emit('message', { requestId, ...data } as ExecuteMessageEvent);
      });
      // 执行线程查询的内容 被动推送
      instance.on('reply', (data: ReplyMessage | ReplyErrorMessage) => {
        this.client.emit(data.event, data);
      });
      // 交互步骤的事件提示
      instance.on('interact-ask', (data: ExecuteInteractAskMessage) => {
        this.client.emit('interact-ask', { requestId, ...data });
      });
      // 调度完毕
      instance.once('done', (data: ExecuteStatusCollection) => {
        // if (!event.debug) setQueueCounter(-data.length);
        setQueueCounter(-data.length);
        delete this.context.dispatch[requestId];
        this.client.emit('dispatch', { event: 'done', data, requestId } as DispatchDoneMessage);
        Logger.info(`[dispatch][done][${requestId}] finished`);
        Logger.info(`[dispatch][stat][${requestId}] delete queue ${data.length}`);
      });
      // 捕捉下错误 虽然不太可能出现
      instance.once('error', (error: Error) => {
        Logger.error(`[dispatch][run][${requestId}] ${error.message}`);
      });
      instance.once('start', (e: number) => {
        // if (!event.debug) setQueueCounter(e);
        setQueueCounter(e);
        Logger.info(`[dispatch][stat][${requestId}] add queue ${e}`);
      });
      // instance.dispatch(event.debug);
      instance.dispatch();
      this.client.emit('dispatch', { event: 'success', requestId } as DispatchSuccessMessage);
      Logger.info(`[dispatch][accept][${requestId}] ip=%s, clientId=%s`, this.client.handshake.address, this.client.id);
    } catch (e) {
      this.sendDispatchError(event, e);
    }
  }

  /**
   * 调度引擎时触发的错误
   * @param event
   * @param err
   */
  private sendDispatchError(event: DispatchMessage, err: DISPATCH_ERROR | Error): void {
    const msg: DispatchErrorMessage = {
      event: 'error',
      requestId: event.requestId,
      data: createDispatchErrorInfo(err),
    };
    Logger.error(`[dispatch][error][${event.requestId || 'unknown'}] ${msg.data.message}`);
    Logger.debug(msg.data.stack);
    this.client.emit('dispatch', msg);
  }

  /**
   * 查询事件
   * @param e
   */
  private onMessageEvent(event: 'query' | 'interact', message: MessageEvent): void {
    if (!isObject(message)) return;
    const requestId = message.requestId;
    if (!requestId) {
      return this.sendMessageError(event, message, COMMON_ERROR.ILLEGAL);
    }
    const dispatch = this.context.dispatch[requestId];
    if (!dispatch) {
      return this.sendMessageError(event, message, COMMON_ERROR.REQUEST_ID_NOT_EXIST);
    }
    try {
      dispatch.sendEvent(event, message);
    } catch (e) {
      return this.sendMessageError(event, message, e);
    }
  }

  /**
   * @param event
   * @param err
   */
  private sendMessageError(event: 'query' | 'interact', message: MessageEvent, err: COMMON_ERROR | Error): void {
    const msg = {
      ...message,
      event,
      requestId: message.requestId || 'unknown',
      params: message.params,
      success: false,
      data: createCommonErrorInfo(err),
    } as ReplyErrorMessage;
    Logger.error(`[${event}][error]${message.requestId || 'unknown'}] ${msg.data.message}`);
    if (msg.data.stack) Logger.debug(msg.data.stack);
    this.client.emit(event, msg);
  }

  /**
   * 取消调度
   * @param event
   */
  private onCancel(event: CancelMessage): void {
    if (!isObject(event)) return;
    const dispatch = this.context.dispatch[event.requestId];
    if (dispatch) {
      // 简单判断
      if (event.params && typeof event.params === 'object') {
        dispatch.cancel(event.params.executeId);
      } else {
        dispatch.cancel();
      }
    }
  }

  /**
   * call event
   * @param event
   */
  private onCall(event: CallMessage): void {
    if (!isObject(event)) return;
    const requestId = event.requestId;
    if (!requestId) {
      return this.sendCallError(event, CALL_ERROR.ILLEGAL);
    }
    // if (this.context.dispatch[requestId]) {
    //   return this.sendCallError(event, CALL_ERROR.DUPLICATED);
    // }
    try {
      // if (isBusy()) {
      //   return this.sendCallError(event, CALL_ERROR.BUSY);
      // }
      dispatchCall(event).then((data: any) => {
        this.client.emit('call', data);
      });
    } catch (e) {
      this.sendCallError(event, e);
    }
  }

  /**
   * @param event
   * @param err
   */
  private sendCallError(event: CallMessage, err: CALL_ERROR | Error): void {
    const msg: CallErrorMessage = {
      requestId: event.requestId,
      call: event.call,
      success: false,
      data: createCallErrorInfo(err),
    };
    Logger.error(`[call][error][${event.requestId || 'unknown'}] ${msg.data.message}`);
    Logger.debug(msg.data.stack);
    this.client.emit('call', msg);
  }
}
