/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { SingleControllerData } from '@engine/core/types/data';
import { CONTROLLER_TYPE, DATA_SOURCE_TYPE } from '@engine/core/enum';
import { DataSource } from '@engine/dispatch/types/data-source';

interface MySQLConnectionConfig {
  config?: {
    charset?: string; // default 'utf8mb4_general_ci'
    database?: string;
  };
}

export interface MySQLDataSource extends DataSource, MySQLConnectionConfig {
  readonly type: DATA_SOURCE_TYPE.MYSQL;
}

export interface MySQLControllerData extends SingleControllerData {
  type: CONTROLLER_TYPE.MYSQL;
  command: string;
  config?: {
    timeout?: number; // default 5000
  };
  serverId: string;
}
