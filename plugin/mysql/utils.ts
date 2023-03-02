/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import mysql from 'mysql2/promise';
import { performance } from 'node:perf_hooks';
import { MySQLDataSource } from '@plugin/mysql/types/data';
import { getPool } from '@plugin/mysql/pool';
import { TimeoutError } from '@engine/core/error';
import { MYSQL_FIELDS_TYPES } from '@engine/core/enum/mysql';
import { CONFIG } from '@engine/config';
import { getSocketInfo, SocketInfo } from '@engine/utils/socket';
import { timerExecute } from '@engine/core/utils';

export type MySQLExecuteResultTypes =
  mysql.RowDataPacket[] |
  mysql.OkPacket |
  mysql.ResultSetHeader;

export interface ExecuteResult {
  data?: mysql.OkPacket | mysql.ResultSetHeader;
  fields?: mysql.FieldPacket[];
  rows?: any[][];
  network?: SocketInfo;
  version?: string;
  explain?: [MySQLExecuteResultTypes, mysql.FieldPacket[]];
  totalTime: number;
  command: string;
}

/**
 * binary data compression, adjust ProtocolBinary::MYSQL_TYPE_DATETIME
 * @see https://dev.mysql.com/doc/internals/en/binary-protocol-value.html
 * @param fields
 * @param rows
 * @returns {mysql.RowDataPacket[]}
 */
const parseData = (fields: mysql.FieldPacket[], rows: any[][]): any[][] => {
  rows.forEach((item, idx) => {
    item.forEach((row: unknown, index: number) => {
      const field = fields[index];
      // @ts-ignore
      if (field.columnType === MYSQL_FIELDS_TYPES.DATETIME && field.decimals !== 0 && typeof row === 'string') {
        if (row.indexOf('.') === -1) {
          // eslint-disable-next-line no-param-reassign
          rows[idx][index] = `${row}.${'0'.repeat(field.decimals)}`;
        }
      }
    });
  });
  return rows;
};

/**
 * execute
 * @param options
 * @param command
 * @param timeout
 */
export const execute = async (
  options: MySQLDataSource,
  command: string,
  timeout: number = CONFIG.MYSQL_DEFAULT_CONNECT_TIMEOUT,
  explain = false,
): Promise<ExecuteResult> => {
  const result = {
    command,
  } as ExecuteResult;
  if (!command) throw new Error('Command is empty');
  // 这里有可能拿不到链接的情况 先不处理 到时候在看下
  const pool = await getPool(options);
  const conn = await pool.instance.getConnection();
  const connection = (conn as any).connection;
  if (connection) {
    result.network = getSocketInfo(connection.stream);
  }
  result.version = pool.version;
  try {
    const startTime = performance.now();
    const data = await timerExecute<[MySQLExecuteResultTypes, mysql.FieldPacket[]]>(
      conn.query<MySQLExecuteResultTypes>(command),
      timeout,
    );
    result.totalTime = performance.now() - startTime;
    // console.log(data[1][0].columnType, data[1][0].columnLength);
    if (Array.isArray(data[0]) && data[1] && Array.isArray(data[1])) {
      result.fields = data[1];
      // result.rows = parseData(data[1], data[0] as any[][]);
      result.rows = data[0] as any[][];
    } else if (!Array.isArray(data[0])) {
      result.data = data[0];
    }
    if (explain === true && command.trim().toLocaleLowerCase().indexOf('explain') !== 0) {
      try {
        const ret = await conn.query<MySQLExecuteResultTypes>(`explain ${command}`);
        result.explain = ret;
      } catch (e) {} // nothing to do here
    }
    conn.release();
  } catch (e) {
    if (e instanceof TimeoutError && conn.threadId) {
      await pool.instance.query(`kill ${conn.threadId}`);
    }
    conn.release();
    throw e;
  }
  return result;
};
