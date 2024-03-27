/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { BaseResult } from '@engine/core/types/result';
import { SingleControllerDetailResult } from '@engine/core/types/result/single';
import { CONTROLLER_TYPE } from '@engine/core/enum';

export interface JDBCFields {
  column: string;
  type: string;
  izBinary: boolean;
  [name: string]: any;
}

export interface JDBCRows {
  [index: number]: any;
}

export interface JDBCExecuteResult {
  rowsAffected?: number;
}

export interface JDBCExtraResult {
  subType?: string;
  user?: string;
  host?: string;
  port?: number;
  database?: string;
  serverName?: string;
  serverId: string;
}

export interface JDBCDetailResult extends SingleControllerDetailResult {
  command: string;
  data?: {
    fields: JDBCFields[];
    rows: JDBCRows[];
  };
  result?: JDBCExecuteResult;
}

export interface JDBCResult extends BaseResult<JDBCExtraResult> {
  type: CONTROLLER_TYPE.JDBC;
}
