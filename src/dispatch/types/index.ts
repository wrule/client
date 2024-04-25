/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */

import { CommonScript } from '@/core/script';
import { ControllerData } from '@/core/types/data';
import { DataSource } from '@/dispatch/types/data-source';
import { Variable } from '@/variable';
import { EXECUTE_MODE } from '@/dispatch';
import { HTTPServer, Server } from '@/dispatch/types/server';
import { Browser, BrowserOptions } from '@/dispatch/types/browser';

export interface DispatchEnv {
  /** env 名称 */
  readonly name: string;
  /** http 服务 */
  readonly httpServer?: HTTPServer[];
  /** tcp/udp/t2 服务 */
  readonly server?: Server[];
  /** 中间件/数据源 */
  readonly dataSource?: DataSource[];
  /** 环境变量 */
  variable?: Variable;
  /** 公共脚本 */
  readonly script?: CommonScript[];
  /** 浏览器信息 UI步骤 */
  readonly browser?: Browser[];
  /** 设备信息 */
  // device?: Device;
}

export interface ExecuteData {
  /** 用例名称 引擎无用 原样返回 */
  readonly name?: string;
  /** 用例ID 引擎无用 原样返回 */
  readonly id?: string;
  /** 用例执行模式 SYNC ASYNC */
  readonly mode: EXECUTE_MODE; // 这里有个设计失误 起名字和下面的 event 有些矛盾
  /** 用例步骤 */
  readonly steps: ControllerData[];
  /** 用例变量 */
  readonly variable?: Variable;

  // 跨用例环境变量
  readonly envVariableConfigs?: any[];

  /** 使用的浏览器名称 对应 browser 中的 name */
  readonly browsers?: BrowserOptions[];
  /** 使用的设备名称 对应 device 中的 name */
  // readonly devices?: string[];
  /**
   * 触发的额外事件
   * 作用于调试，实时汇报进度以及日志信息
   * 这里用 [or] 详见 EXECUTE_EVENTS
   */
  readonly events?: number;
  /** 链路追踪会带上的头数据，格式化为对象，引擎会自己拼接 */
  readonly traceState?: Record<string, string>;
}

export interface DispatchData {
  /** 环境信息 */
  readonly env: DispatchEnv;
  /** 用例信息 */
  readonly execute: ExecuteData[];
  /** 重试次数 */
  readonly retry?: number;
}

export interface ExecuteTaskData {
  /** 执行ID */
  readonly id: number;
  /** 执行数据 */
  readonly execute: ExecuteData | Buffer | Uint8Array;
  /** 上下文 */
  readonly context: DispatchContext;
  /** 用例执行模式 SYNC ASYNC */
  readonly mode: EXECUTE_MODE;
  /** 协议的一些选项 */
  readonly option?: number;
  /** 用例超时时间 */
  readonly timeout?: number;
  /** 是否已被标记取消 */
  isCancel?: boolean;
}

export interface DispatchContext {
  readonly env: DispatchEnv;
  /** 重试次数 */
  readonly retry?: number;
}

export interface DispatchStat {
  completed: number;
  total: number;
}
