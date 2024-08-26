/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable global-require */
/* eslint-disable import/no-dynamic-require */
// @ts-nocheck

import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

import { DispatchData, EXECUTE_MODE } from '@/dispatch';

import Execute from '@/core/execute';
import Logger from '@/logger';
import { opts } from '@/config';
// import debugData from '@/dev/data';
import { registerController, registerDataSource } from '@engine/core';

Logger.warn('Use debug mode, only run one execution unit.');
Logger.warn('Use @swc/core build TypeScript, Do not check for type errors. @see https://github.com/swc-project/swc/issues/571');

const plugins = [
  'sleep',
  'script',
  'http',
  'tcp',
  'grpc',
  'component',
  'condition',
  'loop',
  'poll',
  'data-set',
  'mysql',
  'redis',
  'mongodb',
  'postgresql',
  'rabbitmq',
  'mssql',
  'oracledb',
  // 'browser',
  'jdbc',
];
// 后期改成按需加载 现在直接引入 先统计下耗时 3-5秒内都能接受
// 估计配置比较差的服务器已经超过5秒了 也只是影响第一次执行 也没关系
Logger.debug('-------------------- plugin load stat  --------------------');
// eslint-disable-next-line no-restricted-syntax
for (const plugin of plugins) {
  const now = performance.now();
  require(`@plugin/${plugin}`);
  Logger.debug(`[${plugin}] loaded, time = ${(performance.now() - now).toFixed(2)}ms`);
}
// eslint-disable-next-line no-restricted-syntax
for (const addon of ['tzt']) {
  const now = performance.now();
  const item = require(`@addon/${addon}`);
  // @ts-ignore
  if (item.controller) registerController(...item.controller);
  // @ts-ignore
  if (item.dataSource) registerDataSource(...item.dataSource);
  Logger.debug(`[${addon}] loaded, time = ${(performance.now() - now).toFixed(2)}ms`);
}

let exec!: Execute;

/** 如果上调试 attach 需要时间 最好慢一些 */
try {
  let data!: DispatchData;
  if (opts.input) {
    const dataPath = path.resolve(opts.input);
    Logger.warn(`Use --input ${dataPath}`);
    data = JSON.parse(fs.readFileSync(dataPath).toString('utf8'));
  } else {
    data = require('@/dev/data').default;
  }
  console.log(data);
  console.log(JSON.stringify(data));

  Execute.create({
    execute: data.execute[0],
    context: {
      env: data.env,
    },
    id: 0,
    mode: EXECUTE_MODE.SYNC,
  }).then((e) => {
    exec = e;
    exec.on('error', (err) => {
      Logger.error(err);
    });
    exec.run();
  });
} catch (e) {
  Logger.error(e.message);
  Logger.debug(e.stack);
}

// kill on exit, debugger attach hot reload
process.removeAllListeners();
const answer: string[] = [];
process.stdin.on('data', (chunk) => {
  const value = chunk.toString('utf-8');
  if (value === '\n') {
    // console.log(answer.filter((_) => _));
    exec.interact({
      input: answer.map((_) => _.trim()).filter((_) => _),
      stepId: exec.getGlobalIndex(),
    });
    answer.length = 0;
  } else {
    answer.push(value);
  }
});

// hold process for devtools
setInterval(() => {}, 1 << 30);
