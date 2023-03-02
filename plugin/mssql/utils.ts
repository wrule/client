/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { IResult } from 'mssql';
import { performance } from 'node:perf_hooks';
import { MSSQLDataSource } from '@plugin/mssql/types/data';
import { MSSQLExecuteResult, MSSQLFields } from '@plugin/mssql/types/result';
import { getPool } from '@plugin/mssql/pool';
import { getSocketInfo, SocketInfo } from '@engine/utils/socket';
import { CONFIG } from '@engine/config';
import { timerExecute } from '@engine/core/utils';

export interface ExecuteResult {
  data?: MSSQLExecuteResult;
  fields?: MSSQLFields[];
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
  options: MSSQLDataSource,
  command: string,
  timeout: number = CONFIG.MSSQL_DEFAULT_CONNECT_TIMEOUT,
): Promise<ExecuteResult> => {
  const result = {
    command,
  } as ExecuteResult;
  if (!command) throw new Error('Command is empty');
  const pool = await getPool(options);

  // 这里有可能拿不到链接的情况 先不处理 到时候在看下
  const startTime = performance.now();
  const request = pool.instance.request();
  try {
    const data = await timerExecute<IResult<any>>(request.query<IResult<any>>(command), timeout, `Execute timed out after ${timeout}ms`);
    result.totalTime = performance.now() - startTime;
    // console.log(data);
    // @ts-ignore @fixme
    if (data.recordset && data.columns && data.columns.length > 0) {
      // @ts-ignore @fixme
      result.fields = data.columns[0].map((item) => ({ ...item, type: item.type.declaration }));
      result.rows = data.recordset;
    } else {
      result.data = {
        rowsAffected: data.rowsAffected[0],
      };
    }
  } catch (e) {
    request.cancel();
    throw e;
  } finally {
    // @ts-ignore
    result.network = getSocketInfo(request?._currentRequest?.connection?.socket);
  }
  result.version = pool.version;
  return result;
};
