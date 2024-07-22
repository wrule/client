/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import moment from 'moment';
import OracleDB from 'oracledb';
import Duplex from 'node:stream';
import { performance } from 'node:perf_hooks';
import { OracleDBDataSource } from '@plugin/oracledb/types/data';
import { OracleDBExecuteResult, OracleDBFields } from '@plugin/oracledb/types/result';
import { getPool } from '@plugin/oracledb/pool';
import { SocketInfo } from '@engine/utils/socket';
import { CONFIG } from '@engine/config';
import { timerExecute } from '@engine/core/utils';

const oracledb = OracleDB;

// OracleDB.fetchAsString = [OracleDB.NUMBER];
OracleDB.fetchTypeHandler = (metaData) => {
  if (metaData.dbType == oracledb.DB_TYPE_NUMBER) {
    return {
      type: oracledb.STRING,
      converter: (value: any) => {
        if (value == null) return value;
        if (value.startsWith('.')) value = `0${value}`;
        const num = Number(value);
        if (num.toString() !== value) return value;
        else return num;
      },
    };
  }
};

/**
 * 去掉前后空格和分号
 * @param command
 * @returns {string}
 */
const trim = (command: string): string => {
  let cmd = command.trim();
  if (cmd.endsWith(';')) {
    cmd = cmd.slice(0, -1);
  }
  return cmd;
};

export interface ExecuteResult {
  data?: OracleDBExecuteResult;
  fields?: OracleDBFields[];
  rows?: any[];
  network?: SocketInfo;
  version?: string;
  totalTime: number;
  command: string;
}

/**
 * execute
 * @param pool
 * @param command
 * @param timeout
 */
export const execute = async (
  options: OracleDBDataSource,
  command: string,
  timeout: number = CONFIG.ORACLEDB_DEFAULT_CONNECT_TIMEOUT,
): Promise<ExecuteResult> => {
  const result = {
    command,
  } as ExecuteResult;
  if (!command) throw new Error('Command is empty');
  const pool = await getPool(options);
  // 这里有可能拿不到链接的情况 先不处理 到时候在看下
  const conn = await timerExecute<OracleDB.Connection>(
    pool.instance.getConnection(),
    CONFIG.ORACLEDB_DEFAULT_CONNECT_TIMEOUT,
    `Connect timed out after ${CONFIG.ORACLEDB_DEFAULT_CONNECT_TIMEOUT}ms`,
  );
  try {
    const startTime = performance.now();
    conn.callTimeout = timeout;
    const data = await conn.execute<any>(trim(command));
    result.totalTime = performance.now() - startTime;
    if (data.rows) {
      for (let index = 0; index < data.rows.length; index++) {
        const item = data.rows[index];
        for (let i = 0; i < item.length; i++) {
          if (item[i] instanceof Duplex) {
            item[i] = await item[i].getData();
          } else if (item[i] instanceof Date) {
            item[i] = moment(item[i]).format('YYYY-MM-DD HH:mm:ss');
          }
        }
      }
      result.fields = data.metaData;
      result.rows = data.rows;
    } else {
      result.data = {
        lastRowid: data.lastRowid,
        rowsAffected: data.rowsAffected,
      };
    }
    result.version = pool.version;
    conn.release();
  } catch (e) {
    // if (e instanceof TimeoutError && conn.threadId) {
    //   await pool.query(`kill ${conn.threadId}`);
    // }
    if (conn) conn.release();
    throw e;
  }
  return result;
};
