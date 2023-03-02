/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { DataSource } from '@engine/dispatch/types/data-source';
import { SingleControllerData } from '@engine/core/types/data';
import { CONTROLLER_TYPE, DATA_SOURCE_TYPE } from '@engine/core/enum';

interface MongoDBConnectionConfig {
  config?: {
    database?: string;
    authSource?: string;
  };
}

export interface MongoDBDataSource extends DataSource, MongoDBConnectionConfig {
  readonly type: DATA_SOURCE_TYPE.MONGODB;
}

export interface MongoDBControllerData extends SingleControllerData {
  type: CONTROLLER_TYPE.MONGODB;
  command: string;
  config?: {
    timeout?: number; // default 5000
  };
  serverId: string;
}
