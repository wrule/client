/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { SingleControllerData } from '@engine/core/types/data';
import { CONTROLLER_TYPE, DATA_SOURCE_TYPE } from '@engine/core/enum';
import { DataSource } from '@engine/dispatch/types/data-source';

// enum REDIS_MODE {
//   NORMAL = 1,
//   CLUSTER = 2,
//   SENTINEL = 3
// }

interface RedisConnectionConfig {
  config?: {
    cluster?: boolean;
    database?: number;
    sentinelName?: string;
    sentinelUsername?: string;
    sentinelPassword?: string;
  };
}

export interface RedisDataSource extends DataSource, RedisConnectionConfig {
  readonly type: DATA_SOURCE_TYPE.REDIS;
}

export interface RedisControllerData extends SingleControllerData {
  type: CONTROLLER_TYPE.REDIS;
  command: string | string[];
  config?: {
    timeout?: number; // default 5000
  };
  serverId: string;
}
