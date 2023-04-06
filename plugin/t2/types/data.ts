/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */

import { CONTROLLER_TYPE } from '@engine/core/enum';
import { SingleControllerData } from '@engine/core/types/data';
import { T2Options, T2Server } from '@engine/dispatch/types/server';

/**
  * 支持三种模式
  * 1. 单数据集模式 { a: 1, b: 2 }
  * 2. 复杂数据集模式 { name: { a: 1, b: 2 }, name2: { a: 2, b: 3 } }
  * 3. 无名字复杂数据集模式 [{a: 1, b: 2, c: 3}, {a: 1, b: 2, c: 3}]
  *
  * 关于数字精度问题，使用字符串方式传递，保留所有数字精度 例如 "0.000000001"
 */
export type T2Body = Record<string, unknown> | unknown[] | string;

export interface T2ControllerData extends SingleControllerData {
  type: CONTROLLER_TYPE.T2;
  functionNo: number;
  /** 可以是空包 */
  body?: T2Body;
  /** T2服务器 */
  serverId: string;
  config?: {
    timeout?: number;
  };
  options?: T2Options;
}

export type T2Whale<T> = {
  functionId: number;
  t2Server: T;
};

export type T2WhaleOptions = T2Whale<T2Server>
