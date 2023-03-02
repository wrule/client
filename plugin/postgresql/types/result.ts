/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { BaseResult } from '@engine/core/types/result';
import { SingleControllerDetailResult } from '@engine/core/types/result/single';
import { CONTROLLER_TYPE } from '@engine/core/enum';
import { SocketInfo } from '@engine/utils/socket';

export interface PostgreSQLFields {
  name: string;
  tableID: number;
  columnID: number;
  dataTypeID: number;
  dataTypeSize: number;
  dataTypeModifier: number;
  format: string;
}

export interface PostgreSQLRows {
  [index: number]: any;
}

export interface PostgreSQLExecuteResult {
  rowsAffected?: number;
}

export interface PostgreSQLExtraResult {
  user?: string;
  host?: string;
  port?: number;
  database?: string;
  network?: SocketInfo;
  version?: string;
  serverName?: string;
  serverId: string;
}

export interface PostgreSQLDetailResult extends SingleControllerDetailResult {
  command: string;
  data?: {
    fields: PostgreSQLFields[];
    rows: PostgreSQLRows[];
  };
  result?: PostgreSQLExecuteResult;
}

export interface PostgreSQLResult extends BaseResult<PostgreSQLExtraResult> {
  type: CONTROLLER_TYPE.POSTGRESQL;
}
