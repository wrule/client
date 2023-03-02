/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { BaseResult } from '@engine/core/types/result';
import { SingleControllerDetailResult } from '@engine/core/types/result/single';
import { CONTROLLER_TYPE } from '@engine/core/enum';
import { SocketInfo } from '@engine/utils/socket';

export interface XDeath {
  count: number;
  reason: 'rejected' | 'expired' | 'maxlen';
  queue: string;
  time: {
    '!': 'timestamp';
    value: number;
  };
  exchange: string;
  'original-expiration'?: any;
  'routing-keys': string[];
}

export interface MessagePropertyHeaders {
  'x-first-death-exchange'?: string | undefined;
  'x-first-death-queue'?: string | undefined;
  'x-first-death-reason'?: string | undefined;
  'x-death'?: XDeath[] | undefined;
  [key: string]: any;
}

export interface RabbitMQExtraResult {
  user?: string;
  host?: string;
  port?: number;
  network?: SocketInfo;
  version?: string;
  serverName?: string;
  serverId: string;
  /** 0 = 查询 1 = 发送 */
  mode: number;
  exchangeType?: 'direct' | 'topic' | 'headers' | 'fanout' | 'match';
  /** 为空不使用exchange */
  exchangeName?: string;
  queue?: string;
  routingKey?: string;
}

export interface RabbitMQDetailResult extends SingleControllerDetailResult {
  /** 发送的数据 */
  content?: string | Buffer;
  /** 返回的消息 预处理和 hex view 用 */
  raw?: Buffer;
  /** 消息转换后的内容（可能是错的） 对应 RESULT_DATA 变量 发送模式则是一个布尔值 */
  result?: string;
  /** properties */
  properties?: MessagePropertyHeaders;
  /** 是否查询到 / 发送是否成功 */
  success?: boolean;
}

export interface RabbitMQResult extends BaseResult<RabbitMQExtraResult> {
  type: CONTROLLER_TYPE.POSTGRESQL;
}
