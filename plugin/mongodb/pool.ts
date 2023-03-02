/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { MongoClient, MongoClientOptions } from 'mongodb';
import BasePool, { InstanceResult } from '@engine/core/pool';
import { CONFIG } from '@engine/config';
import { MongoDBDataSource } from '@plugin/mongodb/types/data';
import { ElectronRuntime } from '@mongosh/browser-runtime-electron';
import { CompassServiceProvider } from '@mongosh/service-provider-server';
import EventEmitter from 'node:events';

const getOptions = (server: MongoDBDataSource): MongoClientOptions => {
  let authSource = server.config?.authSource || undefined;
  if (server.user || server.password) {
    authSource = server.config?.authSource || server.config?.database || 'admin';
  }
  return {
    // connectTimeoutMS: this.data.config?.timeout || MONGODB_DEFAULT_COMMAND_TIMEOUT,
    socketTimeoutMS: CONFIG.MONGODB_DEFAULT_CONNECT_TIMEOUT,
    maxPoolSize: 100,
    minPoolSize: 1,
    maxIdleTimeMS: 5000,
    waitQueueTimeoutMS: 5000,
    serverSelectionTimeoutMS: CONFIG.MONGODB_DEFAULT_CONNECT_TIMEOUT,
    // readConcern??
    // readConcernLevel??
    // readPreference??
    // maxStalenessSeconds??
    // readPreferenceTags??
    authSource,
    // authMechanism
    // authMechanismProperties
    // localThresholdMS??
    // heartbeatFrequencyMS??
    // minHeartbeatFrequencyMS??
    appName: CONFIG.MONGODB_DEFAULT_APP_NAME,
    retryReads: false,
    retryWrites: false,
    keepAlive: true,
    // directConnection??
  };
};
interface InstanceMongoDB<T> extends InstanceResult<T> {
  client: MongoClient;
}

/**
 * MongoDBPool 资源池
 */
class MongoDBPool extends BasePool<ElectronRuntime> {
  /**
   * 根据 server 获取资源
   * @param server
   * @returns {Promise<InstanceMongoDB<ElectronRuntime>>}
   */
  public async getPool(server: MongoDBDataSource): Promise<InstanceMongoDB<ElectronRuntime>> {
    // user@host[:port[/database]]
    const key = `${server.user}:${server.password}@${server.host}:${server.port || CONFIG.MONGODB_DEFAULT_PORT}${server.config?.database ? `/${server.config?.database}` : ''}`;
    const client = await this.get(key, server) as InstanceMongoDB<ElectronRuntime>;
    return client;
  }

  /**
   * @inheritdoc
   */
  protected async create(server: MongoDBDataSource): Promise<InstanceMongoDB<ElectronRuntime>> {
    const options = getOptions(server);
    const url = new URL(`mongodb://${server.host}`);
    url.username = server.user || '';
    url.password = server.password || '';
    url.port = (server.port ? server.port : CONFIG.MONGODB_DEFAULT_PORT).toString();
    const client = await MongoClient.connect(url.href, options);
    const bus = new EventEmitter();
    // todo @fixme low version some error
    // @ts-ignore
    const provider = new CompassServiceProvider(client, bus);
    const runtime = new ElectronRuntime(provider);
    const version = await runtime.evaluate('db.version()');
    return { instance: runtime, version: version.printable, client };
  }

  /**
   * @inheritdoc
   */
  protected free(instance: InstanceMongoDB<ElectronRuntime>): void {
    instance.client.close();
  }
}

const pool = new MongoDBPool();

export const getPool = pool.getPool.bind(pool);
