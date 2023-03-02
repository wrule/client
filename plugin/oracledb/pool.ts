/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import oracledb, { Connection, Pool, PoolAttributes } from 'oracledb';
import { OracleDBDataSource } from '@plugin/oracledb/types/data';
import BasePool, { InstanceResult } from '@engine/core/pool';
import { opts, CONFIG } from '@engine/config';

import { timerExecute } from '@engine/core/utils';
/** set global auto commit */
oracledb.autoCommit = true;

let INIT_ORACLE_CLIENT = false;

/**
 * OracleDBD 资源池
 */
class OracleDBDPool extends BasePool<Pool> {
  /**
   * 根据 server 获取资源
   * @param server
   * @returns {Promise<InstanceResult<Pool>>}
   */
  public async getPool(server: OracleDBDataSource): Promise<InstanceResult<Pool>> {
    if (process.platform === 'darwin' && process.arch === 'arm64') {
      throw new Error('Sorry, OracleDB Client Not supported Apple Silicon. see https://www.oracle.com/database/technologies/instant-client/downloads.html');
    }
    if (!INIT_ORACLE_CLIENT) {
      if (process.platform === 'win32') {
        oracledb.initOracleClient({ libDir: opts.lib });
      } else if (process.platform === 'darwin') {
        oracledb.initOracleClient({ libDir: opts.lib });
      } else {
        oracledb.initOracleClient();
      }
      INIT_ORACLE_CLIENT = true;
    }
    // host[:port[/serviceName]]
    const connection = `${server.host}:${server.port || CONFIG.ORACLEDB_DEFAULT_PORT}${server.config?.serviceName ? `/${server.config?.serviceName}` : ''}`;
    // user@host[:port[/serviceName]]
    const key = `${server.user}:${server.password}@${connection}`;
    const client = await this.get(key, server, connection);

    return client;
  }

  /**
   * @inheritdoc
   */
  protected async create(server: OracleDBDataSource, connection: string): Promise<InstanceResult<Pool>> {
    const dbConfig: PoolAttributes = {
      user: server.user,
      password: server.password,
      connectString: connection,

      // queueTimeout: 5000,
      // externalAuth: !!process.env.NODE_ORACLEDB_EXTERNALAUTH,
    };
    const instance = await oracledb.createPool(dbConfig);
    const conn = await timerExecute<Connection>(
      instance.getConnection(),
      CONFIG.ORACLEDB_DEFAULT_CONNECT_TIMEOUT,
      `Connect timed out after ${CONFIG.ORACLEDB_DEFAULT_CONNECT_TIMEOUT}ms`,
    );
    try {
      await conn.ping();
      const version = conn.oracleServerVersionString;
      return { instance, version };
    } finally {
      conn.release();
    }
  }

  /**
   * @inheritdoc
   */
  protected free(instance: InstanceResult<Pool>): void {
    instance.instance.close();
  }
}

const pool = new OracleDBDPool();

export const getPool = pool.getPool.bind(pool);
