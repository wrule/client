/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { BaseResult } from '@engine/core/types/result';
import { SingleControllerDetailResult } from '@engine/core/types/result/single';
import { CONTROLLER_TYPE } from '@engine/core/enum';
import { SocketInfo } from '@engine/utils/socket';
import { MYSQL_FIELDS_TYPES, MYSQL_CHARSET } from '@engine/core/enum/mysql';

export interface MySQLFields {
  characterSet: MYSQL_CHARSET;
  columnLength: number;
  columnType: MYSQL_FIELDS_TYPES;
  decimals: number;
  encoding: string;
  flags: number;
  name: string;
}

export interface MySQLRows {
  [index: number]: any;
}

export interface MySQLExecuteResult {
  affectedRows?: number;
  fieldCount?: number;
  info?: string;
  insertId?: number;
  serverStatus?: number;
  warningStatus?: number;
  changedRows?: number;
  warningCount?: number;
  message?: string;
  procotol41?: boolean;
}

export interface MySQLExplainResult {
  fields: MySQLFields[];
  rows: MySQLRows[];
}

export interface MySQLExtraResult {
  user?: string;
  host?: string;
  port?: number;
  database?: string;
  charset?: string;
  network?: SocketInfo;
  version?: string;
  serverName?: string;
  serverId: string;
}

export interface MySQLDetailResult extends SingleControllerDetailResult {
  command: string;
  data?: {
    fields: MySQLFields[];
    rows: MySQLRows[];
  };
  result?: MySQLExecuteResult;
  explain?: MySQLExplainResult;
}

export interface MySQLResult extends BaseResult<MySQLExtraResult> {
  type: CONTROLLER_TYPE.MYSQL;
}
