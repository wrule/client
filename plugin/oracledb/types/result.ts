/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { Metadata } from 'oracledb';
import { BaseResult } from '@engine/core/types/result';
import { SingleControllerDetailResult } from '@engine/core/types/result/single';
import { CONTROLLER_TYPE } from '@engine/core/enum';

export type OracleDBFields<T = any> = Metadata<T>;

export type OracleDBRows = any[];

export interface OracleDBExecuteResult {
  /**
   * For DML statements (including SELECT FOR UPDATE) this contains the number of rows affected,
   * for example the number of rows inserted. For non-DML statements such as queries and PL/SQL statements,
   * rowsAffected is undefined.
   */
  rowsAffected?: number;
  /**
   * ROWID of a row affected by an INSERT, UPDATE, DELETE or MERGE statement. For other statements,
   * or if no row was affected, it is not set. If more than one row was affected, only the ROWID of the last row is returned.
   */
  lastRowid?: string;
}

export interface OracleDBExtraResult {
  user?: string;
  host?: string;
  port?: number;
  serviceName?: string;
  // network?: SocketInfo;
  version?: string;
  serverName?: string;
  serverId: string;
}

export interface OracleDBDetailResult extends SingleControllerDetailResult {
  command: string;
  data?: {
    fields: OracleDBFields[];
    rows: OracleDBRows[];
  };
  result?: OracleDBExecuteResult;
}

export interface OracleDBResult extends BaseResult<OracleDBExtraResult> {
  type: CONTROLLER_TYPE.ORACLEDB;
}
