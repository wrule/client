/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */

import { DataSource } from '@/dispatch/types/data-source';
import { TimeoutError } from '@/core/error';
import { sleep } from '@/utils';
import { REPLACE_MODE, VariableManagerProxy } from '@/variable';
import { Server, SERVER_TYPE } from '@/dispatch/types/server';

/**
 * 从配置中获取信息
 * @param dataSource
 * @param serverId
 * @returns {DataSource | undefined}
 */
export const getDataSourceByServer = <T extends DataSource>(serverId: string, dataSource: DataSource[] = []): T | undefined => {
  // get env data source config
  const server = dataSource.find((item) => item.serverId === serverId);
  return server as T;
};

/**
 * 获取一个服务器
 * @param serverId
 * @param type
 * @param servers
 * @returns
 */
export const getServerById = <T>(serverId: string, type: SERVER_TYPE, servers: Server[] = []): T | undefined => {
  // get env data source config
  const server = servers.find((item) => item.serverId === serverId && type === item.type);
  return server as T;
};

/**
 * 通用客户端超时定制器
 * @param timeout
 * @returns {Promise<T>}
 */
const createTimer = async <T = any>(timeout: number, message: string | number = timeout): Promise<T> => {
  await sleep(timeout);
  throw new TimeoutError(message);
};

/**
 * execute and wait for timeout
 * @param fn
 * @param timeout
 * @param message
 * @returns {Promise<T>}
 */
export const timerExecute = async <T = any>(fn: Promise<T>, timeout: number, message?: string): Promise<T> => {
  const data = await Promise.race([createTimer<T>(timeout, message), fn]);
  return data;
};

/**
 * Change Type From Variables
 * @param data
 * @param variables
 */
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const changeContentFromVariables = <T = any>(data: any, variables: VariableManagerProxy): T => {
  if (typeof data === 'object') {
    if (data === null) {
      return null as unknown as T;
    }
    if (Array.isArray(data)) {
      return data.map((item) => changeContentFromVariables(item, variables)) as unknown as T;
    }

    const obj: Record<string, any> = {};
    Object.keys(data).forEach((key) => {
      const k = variables.replace(key, REPLACE_MODE.STRING);
      obj[k] = changeContentFromVariables(data[key], variables);
    });
    return obj as T;
  }
  if (typeof data === 'string') {
    return variables.replace(data, REPLACE_MODE.AUTO);
  }
  return data;
};
