/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { SingleControllerData } from '@engine/core/types/data';
import { CONTROLLER_TYPE, DATA_SOURCE_TYPE } from '@engine/core/enum';
import { DataSource } from '@engine/dispatch/types/data-source';

interface PostgreSQLConnectionConfig {
  config?: {
    database?: string;
  };
}

export interface PostgreSQLDataSource extends DataSource, PostgreSQLConnectionConfig {
  readonly type: DATA_SOURCE_TYPE.POSTGRESQL;
}

export interface PostgreSQLControllerData extends SingleControllerData {
  type: CONTROLLER_TYPE.POSTGRESQL;
  command: string;
  config?: {
    timeout?: number; // default 5000
  };
  serverId: string;
}
