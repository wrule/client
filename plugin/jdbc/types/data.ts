/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { SingleControllerData } from '@engine/core/types/data';
import { CONTROLLER_TYPE, DATA_SOURCE_TYPE } from '@engine/core/enum';
import { DataSource } from '@engine/dispatch/types/data-source';
import { FileData } from '@engine/utils/file';

interface JDBCConnectionConfig {
  config?: {
    database?: string;
  };
  /** kv 结构 */
  options?: Record<string, any>;
  files?: Record<string, FileData>;
}

export interface JDBCDataSource extends DataSource, JDBCConnectionConfig {
  readonly type: DATA_SOURCE_TYPE.JDBC;
  readonly subType: string;
}

export interface JDBCControllerData extends SingleControllerData {
  type: CONTROLLER_TYPE.JDBC;
  command: string;
  config?: {
    timeout?: number; // default 5000
  };
  serverId: string;
}
