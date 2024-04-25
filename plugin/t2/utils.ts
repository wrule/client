/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import http from 'node:http';
import Got from 'got';
import { T2Body, T2ControllerData, T2WhaleOptions } from '@plugin/t2/types/data';
import { downloadFile } from '@engine/utils/file';
import { T2Server, SERVER_TYPE } from '@engine/dispatch/types/server';
import { Context } from '@engine/core/execute';
import { getServerById } from '@engine/core/utils';
import { CONFIG, opts } from '@/config';
import { T2Result } from './types/result';

type T2WhaleResult = {
  success: boolean;
  error?: string;
  data: {
    responseMsg?: any;
    requestMsg?: any;
  };
}

/**
 * Download T2 File
 * @param data
 */
export const downloadT2File = async (data: T2ControllerData, context: Context): Promise<void> => {
  const server = getServerById<T2Server>(data.serverId, SERVER_TYPE.T2, context.env.server);
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
 * T2协议执行
*/
export const execute = async (options: T2WhaleOptions, timeout: number, body?: T2Body): Promise<T2Result> => {
  const result = {
  } as T2Result;
  const server = `${opts.t2ServiceHost}:${opts.t2ServicePort}`;
  // const server = '10.10.16.105:9123';
  try {
    // select * from test2
    const data = await Got<T2WhaleResult>(`http://${server}/twhale/t2`, {
      method: 'POST',
      json: {
        ...options,
        requestMsg: body,
      },
      timeout: {
        lookup: CONFIG.T2_DEFAULT_CONNECT_TIMEOUT,
        connect: CONFIG.T2_DEFAULT_CONNECT_TIMEOUT,
        secureConnect: CONFIG.T2_DEFAULT_CONNECT_TIMEOUT,
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
    throw new Error(`Error: failed to connect to T2 service, 错误信息: [${e.message}]`);
  }

  return result;
};
