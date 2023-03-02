/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { SingleControllerData } from '@engine/core/types/data';
import { CONTROLLER_TYPE, DATA_SOURCE_TYPE } from '@engine/core/enum';
import { DataSource } from '@engine/dispatch/types/data-source';

interface MSSQLConnectionConfig {
  config?: {
    database?: string;
  };
}

export interface MSSQLDataSource extends DataSource, MSSQLConnectionConfig {
  readonly type: DATA_SOURCE_TYPE.MSSQL;
}

export interface MSSQLControllerData extends SingleControllerData {
  type: CONTROLLER_TYPE.MSSQL;
  command: string;
  config?: {
    timeout?: number; // default 5000
  };
  serverId: string;
}
