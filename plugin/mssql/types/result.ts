/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { BaseResult } from '@engine/core/types/result';
import { SingleControllerDetailResult } from '@engine/core/types/result/single';
import { CONTROLLER_TYPE } from '@engine/core/enum';
import { SocketInfo } from '@engine/utils/socket';

export interface MSSQLFields {
  /** 序号 好像没啥意义 */
  index: number;
  name: string;
  /** 序号 部分字段有 */
  length?: number;
  type: string;
  // scale?: undefined; ?? 未知
  // precision: undefined; ?? 未知
  nullable: boolean;
  caseSensitive: boolean;
  identity: boolean;
  readOnly: boolean;
}

export interface MSSQLRows {
  [index: number]: any;
}

export interface MSSQLExecuteResult {
  rowsAffected?: number;
}

export interface MSSQLExtraResult {
  user?: string;
  host?: string;
  port?: number;
  database?: string;
  network?: SocketInfo;
  version?: string;
  serverName?: string;
  serverId: string;
}

export interface MSSQLDetailResult extends SingleControllerDetailResult {
  command: string;
  data?: {
    fields: MSSQLFields[];
    rows: MSSQLRows[];
  };
  result?: MSSQLExecuteResult;
}

export interface MSSQLResult extends BaseResult<MSSQLExtraResult> {
  type: CONTROLLER_TYPE.MSSQL;
}
