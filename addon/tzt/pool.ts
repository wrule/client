/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
/* eslint-disable camelcase */

import TZTSDK from 'node-tzt';
import os from 'node:os';
import path from 'node:path';
import BasePool, { InstanceResult } from '@engine/core/pool';
import { TZTServer } from '@addon/tzt/types';
import { opts } from '@engine/config';

// 实际上没有池的概念
// 封装的时候没有做任何限制 本身就是异步多线程的

let INIT_TZT_CLIENT = false;

/**
 * TZT 资源池
 */
class TZTPool extends BasePool<TZTSDK.Instance> {
  /**
   * 根据 server 获取资源
   * @param server
   * @returns {Promise<InstanceResult<TZTSDK.Instance>>}
   */
  public async getPool(server: TZTServer): Promise<InstanceResult<TZTSDK.Instance>> {
    if (process.platform === 'darwin') {
      throw new Error('Sorry, TZT Client Not supported macOS. Please try other system.');
    }
    if (process.arch !== 'x64') {
      throw new Error(`Sorry, TZT Client Not supported ${process.arch}. Please try other system.`);
    }
    if (os.version().indexOf('Alpine') !== -1) {
      throw new Error('Sorry, TZT Client Not supported Alpine Linux(musl-libc). Please try other system.');
    }

    if (!INIT_TZT_CLIENT) {
      if (process.platform === 'win32') {
        TZTSDK.initTZTClient(path.resolve(`${opts.lib}/http64.dll`));
      } else {
        TZTSDK.initTZTClient('libhttp.so');
      }
      INIT_TZT_CLIENT = true;
    }
    const connection = `${server.host}:${server.port}`;
    const client = await this.get(connection, server);

    return client;
  }

  /**
   * @inheritdoc
   */
  protected async create(server: TZTServer): Promise<InstanceResult<TZTSDK.Instance>> {
    const instance = await new TZTSDK();
    return { instance };
  }

  /**
   * @inheritdoc
   */
  protected free(instance: InstanceResult<TZTSDK.Instance>): void {
    /** @fixme not support disconnect */
    // instance.disconnect();
  }
}

const pool = new TZTPool();

export const getTZTPool = pool.getPool.bind(pool);
