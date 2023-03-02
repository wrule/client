/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { SingleControllerData } from '@engine/core/types/data';
import { CONTROLLER_TYPE, DATA_SOURCE_TYPE } from '@engine/core/enum';
import { DataSource } from '@engine/dispatch/types/data-source';

interface OracleDBConnectionConfig {
  /** TNS:listener name  */
  config?: {
    serviceName?: string;
  };
}

export interface OracleDBDataSource extends DataSource, OracleDBConnectionConfig {
  readonly type: DATA_SOURCE_TYPE.ORACLEDB;
}

export interface OracleDBControllerData extends SingleControllerData {
  type: CONTROLLER_TYPE.ORACLEDB;
  command: string;
  config?: {
    timeout?: number; // default 5000
  };
  serverId: string;
}
