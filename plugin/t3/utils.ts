/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import http from 'node:http';
import Got from 'got';
import { T3Body, T3ControllerData, T3WhaleOptions } from '@plugin/t3/types/data';
import { downloadFile } from '@engine/utils/file';
import { T3Server, SERVER_TYPE } from '@engine/dispatch/types/server';
import { Context } from '@engine/core/execute';
import { getServerById } from '@engine/core/utils';
import { CONFIG, opts } from '@/config';
import { T3Result } from './types/result';

type T3WhaleResult = {
  success: boolean;
  error?: string;
  data: {
    responseMsg?: any;
    requestMsg?: any;
  };
}

/**
 * Download T3 File
 * @param data
 */
export const downloadT3File = async (data: T3ControllerData, context: Context): Promise<void> => {
  const server = getServerById<T3Server>(data.serverId, SERVER_TYPE.T3, context.env.server);
  if (server) {
    if (server.config.license) {
      await downloadFile(server.config.license.cert);
    }
    if (server.config?.tls) {
      const cfg = server.config.tls;
      if (cfg.cert.ext) {
        cfg.cert.ext = 'pfx';
      }
      await downloadFile(cfg.cert);
    }
  }
};

const agent = new http.Agent({
  keepAlive: true,
  timeout: 120 * 1000,
});

/**
 * T3协议执行
*/
export const execute = async (options: T3WhaleOptions, timeout: number, body?: T3Body): Promise<T3Result> => {
  const result = {
  } as T3Result;
  // t3和t2类似，访问的地址这里不做区分，使用同一份配置
  const server = `${opts.t2ServiceHost}:${opts.t2ServicePort}`;
  // const server = '10.10.16.105:9123';
  try {
    // select * from test2
    const data = await Got<T3WhaleResult>(`http://${server}/twhale/t3`, {
      method: 'POST',
      json: {
        ...options,
        requestMsg: body,
      },
      timeout: {
        lookup: CONFIG.T3_DEFAULT_CONNECT_TIMEOUT,
        connect: CONFIG.T3_DEFAULT_CONNECT_TIMEOUT,
        secureConnect: CONFIG.T3_DEFAULT_CONNECT_TIMEOUT,
        request: timeout,
      },
      agent: { http: agent },
      retry: 0,
      responseType: 'json',
    });
    result.totalTime = data.timings.phases.total || 0;
    if (data.body.success !== true) {
      const error = new Error(data.body.error);
      delete error.stack;
      throw error;
    } else {
      result.data = data.body;
    }
  } catch (e) {
    if (!e.stack) {
      throw e;
    }
    throw new Error(`Failed to connect to T3 service ${server}, please check engine configuration [${e.message}]`);
  }

  return result;
};
