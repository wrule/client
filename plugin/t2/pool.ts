/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
/* eslint-disable camelcase */

import T2SDK from 'node-t2sdk';
import os from 'node:os';
import path from 'node:path';
import iconv from 'iconv-lite';
import BasePool, { InstanceResult } from '@engine/core/pool';
import { T2Server } from '@engine/dispatch/types/server';
import { opts, CONFIG } from '@engine/config';
import { getFullPath } from '@engine/utils/file';

// 实际上没有池的概念
// 封装的时候没有做任何限制 本身就是异步多线程的

let INIT_T2_CLIENT = false;

/**
 * T2 资源池
 */
class T2Pool extends BasePool<T2SDK.Instance> {
  /**
   * 根据 server 获取资源
   * @param server
   * @returns {Promise<InstanceResult<T2SDK.Instance>>}
   */
  public async getPool(server: T2Server): Promise<InstanceResult<T2SDK.Instance>> {
    if (process.platform === 'darwin') {
      throw new Error('Sorry, T2 Client Not supported macOS. Please try other system.');
    }
    if (process.arch !== 'x64') {
      throw new Error(`Sorry, T2 Client Not supported ${process.arch}. Please try other system.`);
    }
    if (os.version().indexOf('Alpine') !== -1) {
      throw new Error('Sorry, T2 Client Not supported Alpine Linux(musl-libc). Please try other system.');
    }

    if (!INIT_T2_CLIENT) {
      if (process.platform === 'win32') {
        T2SDK.initT2Client(path.resolve(`${opts.lib}/t2sdk.dll`));
      } else {
        T2SDK.initT2Client('libt2sdk.so');
      }
      INIT_T2_CLIENT = true;
    }
    const connection = `${server.host}:${server.port}`;
    const client = await this.get(connection, server);

    return client;
  }

  /**
   * @inheritdoc
   */
  protected async create(server: T2Server): Promise<InstanceResult<T2SDK.Instance>> {
    const licenseFilePath = getFullPath(server.config.license.cert);
    const options: Record<string, unknown> = {
      t2sdk: {
        servers: `${server.host}:${server.port}`,
        license_file: licenseFilePath,
        license_pwd: server.config.license.certPwd,
        login_name: 'XEngine',
      },
    };

    if (server.config?.tls && server.config.tls.cert['@fileKey']) {
      const certFilePath = getFullPath(server.config.tls.cert);
      options.safe = {
        safe_level: 'ssl',
        // client_id: 123456 ?
        // comm_pwd: 888888 ?
        cert_file: certFilePath,
        cert_pwd: server.config.tls.certPwd,
      };
    }
    const instance = await new T2SDK();
    instance.setOptions(options);
    if (server.config?.encoding && server.config?.encoding !== 0) {
      instance.setEncoding(server.config.encoding);
    }
    const conn = instance.initConnection(CONFIG.T2_DEFAULT_CONNECT_TIMEOUT);
    if (conn.errcode !== 0) {
      throw new Error(iconv.decode(conn.errmsg, 'gbk')); // 动态库是GBK的
    }
    return { instance };
  }

  /**
   * @inheritdoc
   */
  protected free(instance: InstanceResult<T2SDK.Instance>): void {
    /** @fixme not support disconnect */
    // instance.disconnect();
  }
}

const pool = new T2Pool();

export const getT2Pool = pool.getPool.bind(pool);
