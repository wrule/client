/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import http from 'node:http';
import Got from 'got';
import { JDBCControllerData, JDBCDataSource } from '@plugin/jdbc/types/data';
import { JDBCExecuteResult, JDBCFields } from '@plugin/jdbc/types/result';
import { opts, CONFIG } from '@engine/config';
import { InstanceResult } from '@/core/pool';
import { Context } from '@engine/core/execute';
import { getDataSourceByServer } from '@engine/core/utils';
import { downloadFile, FileData, getFullPath } from '@engine/utils/file';
import Logger from '@/logger';

export interface ExecuteResult {
  data?: JDBCExecuteResult;
  fields?: JDBCFields[];
  rows?: any[];
  totalTime: number;
  command: string;
}

interface Result {
  success: boolean;
  error?: string;
  data: {
    metadata?: JDBCFields[];
    data?: any[][];
    effectRows: number;
  };
}

const agent = new http.Agent({
  keepAlive: true,
  timeout: 120 * 1000,
});

const getFilesData = (files?: Record<string, FileData>): Record<string, string> => {
  const data: Record<string, string> = {};
  if (files) {
    // eslint-disable-next-line no-restricted-syntax
    for (const [key, file] of Object.entries(files)) {
      data[key] = getFullPath(file);
    }
  }
  return data;
};

/**
 * execute
 * @param pool
 * @param command
 * @param timeout
 */
export const execute = async (
  options: JDBCDataSource,
  command: string,
  timeout: number = CONFIG.JDBC_DEFAULT_CONNECT_TIMEOUT,
): Promise<ExecuteResult> => {
  const result = {
    command,
  } as ExecuteResult;
  if (!command) throw new Error('Command is empty');

  const server = `${opts.jdbcServiceHost}:${opts.jdbcServicePort}`;
  // const server = '10.10.31.32:9123';
  try {
    try {
      Logger.info('[JDBC-data-Got]', 678);
    } catch (error) { }
    // select * from test2
    const data = await Got<Result>(`http://${server}/twhale/jdbc`, {
      method: 'POST',
      json: {
        subType: options.subType,
        command,
        config: options.config,
        serverId: options.serverId,
        host: options.host,
        user: options.user,
        password: options.password,
        port: options.port,
        options: options.options,
        files: getFilesData(options.files),
      },
      agent: { http: agent },
      timeout: {
        lookup: CONFIG.JDBC_DEFAULT_CONNECT_TIMEOUT,
        connect: CONFIG.JDBC_DEFAULT_CONNECT_TIMEOUT,
        secureConnect: CONFIG.JDBC_DEFAULT_CONNECT_TIMEOUT,
        request: timeout,
      },
      retry: 0,
      responseType: 'json',
    });
    try {
      Logger.info('[JDBC-data-Got]', data);
    } catch (error) { }
    result.totalTime = data.timings.phases.total || 0;
    if (data.body.success !== true) {
      const error = new Error(data.body.error);
      delete error.stack;
      throw error;
    } else {
      const body = data.body.data;
      if (body.metadata && body.data) {
        result.fields = body.metadata;

        const izBinary = body.metadata.map((field) => field.izBinary === true);

        if (izBinary.some((value) => value === true)) {
          body.data.forEach((dat) => {
            dat.forEach((item, i) => {
              if (izBinary[i] && typeof item === 'string') {
                // eslint-disable-next-line no-param-reassign
                dat[i] = Buffer.from(item, 'base64');
              }
            });
          });
        }
        result.rows = body.data;
        try {
          Logger.info('[JDBC-data-result1]', JSON.stringify(result));
        } catch (error) { }
      }
    }
  } catch (e) {
    if (!e.stack) {
      throw e;
    }
    throw new Error(`Failed to connect to JDBC service ${server}, please check engine configuration [${e.message}]`);
  }
  try {
    Logger.info('[JDBC-data-result2]', JSON.stringify(result));
  } catch (error) { }
  return result;
};

export const testDataSource = async (options: JDBCDataSource): Promise<InstanceResult<any>> => {
  const server = `${opts.jdbcServiceHost}:${opts.jdbcServicePort}`;

  // @fixme first download file
  if (options.files) {
    const files = options.files;
    const list = Object.keys(files);
    for (let i = 0; i < list.length; i++) {
      const item = files[list[i]];
      await downloadFile(item);
    }
  }

  try {
    try {
      Logger.info('[JDBC-data-Got2]', 123);
    } catch (error) { }
    // select * from test2
    const data = await Got<Result>(`http://${server}/twhale/jdbc`, {
      method: 'POST',
      json: {
        subType: options.subType,
        config: options.config,
        serverId: options.serverId,
        host: options.host,
        user: options.user,
        password: options.password,
        port: options.port,
        options: options.options,
        files: getFilesData(options.files),
      },
      agent: { http: agent },
      timeout: {
        lookup: CONFIG.JDBC_DEFAULT_CONNECT_TIMEOUT,
        connect: CONFIG.JDBC_DEFAULT_CONNECT_TIMEOUT,
        secureConnect: CONFIG.JDBC_DEFAULT_CONNECT_TIMEOUT,
        request: CONFIG.JDBC_DEFAULT_CONNECT_TIMEOUT,
      },
      retry: 0,
      responseType: 'json',
    });
    try {
      Logger.info('[JDBC-data-Got2]', data);
    } catch (error) { }
    if (data.body.success !== true) {
      const error = new Error(data.body.error);
      delete error.stack;
      throw error;
    } else {
      return {
        instance: true,
      };
    }
  } catch (e) {
    if (!e.stack) {
      throw e;
    }
    throw new Error(`Failed to connect to JDBC service ${server}, please check engine configuration [${e.message}]`);
  }
};

/**
 * Download T2 File
 * @param data
 */
export const downloadJDBCFile = async (data: JDBCControllerData, context: Context): Promise<void> => {
  const server = getDataSourceByServer<JDBCDataSource>(data.serverId, context.env.dataSource);
  if (server) {
    if (server.files) {
      const files = server.files;
      const list = Object.keys(files);
      for (let i = 0; i < list.length; i++) {
        const item = files[list[i]];
        await downloadFile(item);
      }
    }
  }
};
