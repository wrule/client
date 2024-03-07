/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { QueryArrayResult } from 'pg';
import { performance } from 'node:perf_hooks';
import { PostgreSQLDataSource } from '@plugin/postgresql/types/data';
import { PostgreSQLExecuteResult, PostgreSQLFields } from '@plugin/postgresql/types/result';
import { getPool } from '@plugin/postgresql/pool';
import { getSocketInfo, SocketInfo } from '@engine/utils/socket';
import { CONFIG } from '@engine/config';
import { timerExecute } from '@engine/core/utils';

export interface ExecuteResult {
  data?: PostgreSQLExecuteResult;
  fields?: PostgreSQLFields[];
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
  options: PostgreSQLDataSource,
  command: string,
  timeout: number = CONFIG.ORACLEDB_DEFAULT_CONNECT_TIMEOUT,
): Promise<ExecuteResult> => {
  const result = {
    command,
  } as ExecuteResult;
  if (!command) throw new Error('Command is empty');
  const pool = await getPool(options);
  const conn = await pool.instance.connect();
  const startTime = performance.now();
  try {
    // @ts-ignore
    result.network = getSocketInfo(conn?.connection?.stream);
    const data = await timerExecute<QueryArrayResult<any[]>>(
      conn.query({ text: command, rowMode: 'array' }),
      timeout,
      `Execute timed out after ${timeout}ms`,
    );
    result.totalTime = performance.now() - startTime;
    if (data.fields && data.fields.length && data.rows) {
      result.fields = data.fields.map((field) => ({ ...field }));
      result.rows = data.rows;
    } else {
      result.data = {
        rowsAffected: data.rowCount as any,
      };
    }
  } finally {
    conn.release();
  }

  result.version = pool.version;
  return result;
};
