/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { SingleControllerData } from '@engine/core/types/data';
import { CONTROLLER_TYPE, DATA_SOURCE_TYPE } from '@engine/core/enum';
import { DataSource } from '@engine/dispatch/types/data-source';

interface RabbitMQConnectionConfig {
  config?: {
    vhost?: string;
  };
}

export interface RabbitMQDataSource extends DataSource, RabbitMQConnectionConfig {
  readonly type: DATA_SOURCE_TYPE.RABBITMQ;
}

export interface RabbitMQControllerData extends SingleControllerData {
  type: CONTROLLER_TYPE.POSTGRESQL;
  /** 0 = 查询 1 = 发送 */
  mode: number;
  exchangeType?: 'direct' | 'topic' | 'headers' | 'fanout' | 'match';
  /** 为空不使用exchange */
  exchangeName?: string;
  queue?: string;
  routingKey?: string;
  content?: string | Buffer;
  config?: {
    timeout?: number; // default 5000
  };
  serverId: string;
}
