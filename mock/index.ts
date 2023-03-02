/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */

import cluster from 'node:cluster';
import os from 'node:os';
import HTTPMockServer from '@mock/http/server';
import logger from '@engine/logger';
import { MockConfig } from '@mock/types';

export const startMockCluster = async (config: MockConfig): Promise<void> => {
  if (config.http && config.http.port === config.control.port) {
    logger.error('Mock server port cannot be the same as control port');
    process.exit(1);
  }
  if (cluster.isPrimary) {
    process.title = 'XEngine MockServer - Master';
    const server = await HTTPMockServer.create({
      host: config.control.host,
      port: config.control.port,
      rules: config.http?.rules || {},
    });
    if (server) {
      logger.info(`MockServer - Master running at: ${config.control.host}:${config.control.port}`);

      const cpuNum = config.worker || os.cpus().length;

      for (let i = 0; i < cpuNum; ++i) {
        cluster.fork();
      }

      // 监听子进程退出后重启事件
      cluster.on('exit', (worker, code, signal) => {
        logger.warn(`[Master] worker ${worker.process.pid} died with code:${code}, and ${signal}`);
        cluster.fork(); // 重启子进程
      });

      cluster.on('listening', (worker, address) => {
        logger.info(`MockServer - Worker running at: ${address.address}:${address.port}`);
        server.control.refresh(worker);
      });
    }
  } else {
    process.title = 'XEngine MockServer - Worker';
    if (config.http) {
      HTTPMockServer.create(config.http);
    }
  }
};
