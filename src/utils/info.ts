/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */

import os from 'node:os';
import { ENGINE_VERSION } from '@/utils';
import workerPool from '@/worker';
import { CONFIG } from '@/config';

export interface SystemInfo {
  /** 引擎版本 */
  version: string;
  /** 引擎 git commit id */
  commit: string;
  /** node版本 */
  node: string;
  /** uname(3) */
  platform: string;
  /** v8版本 */
  v8: string;
  /** openssl 版本 */
  openssl: string;
  /** 启动的用户名 */
  username: string;
  /** 进程ID */
  pid: number;
  /** 启动的用户ID */
  uid: number;
  /** CPU核心数 */
  cpus: number;
  /** 最大内存 */
  totalmem: number;
  /** 空闲内存 */
  freemem: number;
  /** 最大异步执行单元 */
  maxWorker: number;
  /** 当前空闲的单元 */
  idleWorker: number;
  /** isBusy */
  isBusy: boolean;
  /** 引擎启动时间 */
  startTime: number;
  /** 用户tmp目录 */
  tmpdir: string;
  /** cpu 型号和速度 */
  cpu: string;
}

const START_TIME = new Date().getTime();

let queueLength = 0;
export const setQueueCounter = (length: number): void => {
  queueLength += length;
};
export const getQueueCounter = (): number => queueLength;

export const isBusy = (): boolean => {
  if (getQueueCounter() > CONFIG.WORKER_MAX_COUNT * 5) {
    return true;
  }
  if (workerPool.getIdleWorkerCount() > 0) {
    return false;
  }
  return workerPool.getQueueCount() > CONFIG.WORKER_MAX_COUNT * 1.5;
};

/**
 * 获取引擎基本信息
 * @returns {SystemInfo}
 */

const cpus = os.cpus();
const platform = `${os.type()} ${os.arch()} ${os.release()}`;
const username = os.userInfo().username;
const uid = os.userInfo().uid;
const tmpdir = os.tmpdir();

export const getSystemInfo = (): SystemInfo => ({
  version: ENGINE_VERSION,
  commit: `${process.env.BUILD_TIME || 'develop'} (git-${process.env.GIT_COMMIT})`,
  node: process.version,
  platform,
  v8: process.versions.v8,
  openssl: process.versions.openssl,
  username,
  pid: process.pid,
  uid,
  cpus: cpus.length,
  totalmem: os.totalmem(),
  freemem: os.freemem(),
  maxWorker: CONFIG.WORKER_MAX_COUNT,
  idleWorker: workerPool.getIdleWorkerCount(),
  isBusy: isBusy(),
  startTime: START_TIME,
  tmpdir,
  cpu: cpus[0].model,
});
