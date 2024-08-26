/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
/* eslint-disable no-bitwise */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable global-require */
/* eslint-disable @typescript-eslint/no-var-requires */
// import fs from 'node:fs';
// import path from 'node:path';
import { isMainThread, parentPort, MessagePort } from 'node:worker_threads';
import Execute from '@/core/execute';
import { createExecuteListener } from '@/worker/listener';
import { query } from '@/worker/query';
import { executeCall } from '@/worker/call';
import { WORKER_TASK_TYPE, Task } from '@/worker';
import { isDeveloper } from '@/utils';
import Logger from '@/logger';
import { interact } from '@/worker/interact';
// import { registerController, registerDataSource } from '@engine/core';

// 暂时先这样
import '@plugin/sleep';
import '@plugin/script';

import '@plugin/http';
import '@plugin/t2';
import '@plugin/t3';
import '@plugin/tcp';
import '@plugin/grpc';

import '@plugin/component';
import '@plugin/condition';
import '@plugin/loop';
import '@plugin/poll';
import '@plugin/data-set';
import '@plugin/data-set-case';

import '@plugin/mysql';
import '@plugin/redis';
import '@plugin/mongodb';
import '@plugin/postgresql';
import '@plugin/rabbitmq';
import '@plugin/mssql';
import '@plugin/oracledb';
import '@plugin/jdbc';
// 临时
import '@addon/tzt';

process.on('uncaughtException', (error, origin) => {
  console.log('[uncaught error 2]', error, origin);
});

process.on('unhandledRejection', (reason, promise) => {
  console.log('[uncaught error 3]', reason, promise);
});

// import '@plugin/browser';

// if (isDeveloper) {
//   require('inspector').open(9230);
// }

// // 临时
// const root = process.cwd();
// const addonPath = path.resolve(root, 'addon');
// if (fs.existsSync(addonPath)) {
//   console.log(addonPath);

//   fs.readdirSync(addonPath).forEach((file) => {
//     console.log(addonPath, file);
//     if (file.endsWith('.js')) {
//       Logger.info(`[addon] load ${file}`);
//       // eslint-disable-next-line import/no-dynamic-require
//       const addon = require(path.resolve(addonPath, file));
//       // @ts-ignore
//       if (addon.controller) registerController(...addon.controller);
//       // @ts-ignore
//       if (addon.dataSource) registerDataSource(...addon.dataSource);
//     }
//   });
// }

let exec: Execute | null = null;
let channel: MessagePort | null = null;

if (!isMainThread && parentPort) {
  // 主线程通信channel端口监听事件
  parentPort.on('message', async (event: Task) => {
    // Logger.debug(JSON.stringify(event), '11111111111111111');
    switch (event.task) {
      case WORKER_TASK_TYPE.QUERY:
        if (exec && channel) query(exec, event, channel);
        break;
      case WORKER_TASK_TYPE.CANCEL:
        if (exec && channel) exec.cancel();
        break;
      case WORKER_TASK_TYPE.CALL:
        executeCall(event);
        break;
      case WORKER_TASK_TYPE.INTERACT:
        if (exec && channel) interact(exec, event, channel);
        break;
      case WORKER_TASK_TYPE.EXECUTE:
        channel = event.channel;
        try {
          const listeners = createExecuteListener(event);
          exec = await Execute.create(event.data, listeners);
          if (parentPort) parentPort.postMessage(`[thread] start execute id = ${event.data.id}`);
          await exec.run();
        } catch (e) {
          Logger.error(e.message);
          Logger.debug(e.stack);
          // 兜底 保证始终释放线程
          Logger.debug('222222222222222');
          channel.close();
          exec = null;
          channel = null;
        }
        break;
        // no default
    }
  });

  parentPort.postMessage(`[thread] online pid: ${process.pid}`);
  setInterval(() => {
    if (parentPort) parentPort.postMessage(1); // 定时器和主线程通信，刷新worker存活状态
  }, 2000);
}

// setInterval(() => {
//   console.log(process.memoryUsage());
// }, 2000);
