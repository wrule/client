/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { Application, TConsumerChannel } from 'node-dubbo/lib/application';
import { ZooKeeper } from 'node-dubbo/lib/zookeeper';
import { Consumer, Channel } from 'node-dubbo/lib/consumer';
import BasePool, { InstanceResult } from '@engine/core/pool';
import { ZooKeeperDataSource } from '@plugin/dubbo/types/zookeeper';
import { CONFIG } from '@engine/config';
import { timerExecute } from '@engine/core/utils';

interface AppInstance {
  app: Application;
  invoke(instance: InstanceResult<AppInstance>, name: string, options: {
    group?: string;
    version?: string;
  }): Promise<TConsumerChannel>;
}

type Instance = InstanceResult<AppInstance>

interface Options {
  host: string;
  group: string;
}

/**
 * Dubbo 资源池
 */
class DubboPool extends BasePool<AppInstance> {
  /**
   * 根据 server 获取资源
   * @param services
   * @returns {Promise<Instance>}
   */
  public async getPool(services: ZooKeeperDataSource): Promise<Instance> {
  // host[:port]
    const group = services.config?.group ? services.config.group : 'dubbo';
    const host = `${services.host}:${services.port || CONFIG.ZOOKEEPER_DEFAULT_PORT}`;
    const key = `${host}/${group}`;
    const app = await this.get(key, { host, group });
    return app;
  }

  /**
   * @inheritdoc
   */
  protected async create(options: Options): Promise<Instance> {
    const app = new Application();
    app.application = CONFIG.ZOOKEEPER_DEFAULT_APP_NAME;
    app.timeout = 10000;
    app.retries = 1;
    // app.version = '2.0.2';
    const consumer = new Consumer(app);
    const registry = new ZooKeeper(app, {
      host: options.host,
      retries: 5,
      spinDelay: 100,
      sessionTimeout: 5000,
    });
    app.root = options.group;
    app.useRegistry(registry);
    app.useConsumer(consumer);
    registry.on('stop', async () => {
      // delete
      // console.log('stop1');
      this.del(`${options.host}/${options.group}`);
    });
    try {
      await timerExecute(
        app.start(),
        CONFIG.ZOOKEEPER_DEFAULT_CONNECT_TIMEOUT,
        `Connect zookeeper timed out after ${CONFIG.ZOOKEEPER_DEFAULT_CONNECT_TIMEOUT}ms, host = ${options.host}`,
      );
    } catch (e) {
      app.stop();
      throw e;
    }

    return { instance: { app, invoke: DubboPool.invoke }, cache: {} };
  }

  private static async invoke(instance: InstanceResult<AppInstance>, name: string, options: {
    group?: string;
    version?: string;
  }): Promise<TConsumerChannel> {
    const key = `${name}/${options.group}/${options.version}`;
    if (instance?.cache && instance.cache[key]) {
      return instance.cache[key] as TConsumerChannel;
    }
    // invoke
    const invoke = instance.instance.app.registry.invoke(name, {
      group: options.group,
      version: options.version,
    });
    try {
      const client = await timerExecute(
        invoke,
        CONFIG.DUBBO_DEFAULT_INVOKE_TIMEOUT,
        `Dubbo invoke timed out after ${CONFIG.DUBBO_DEFAULT_INVOKE_TIMEOUT}ms`,
      ) as Channel;
      // @ts-ignore
      // eslint-disable-next-line no-param-reassign
      instance.cache[key] = client;
      client.once('close', () => {
        // @ts-ignore
        // eslint-disable-next-line no-param-reassign
        delete instance.cache[key];
        console.log('close');
      });
      client.once('disconnect', () => {
        // @ts-ignore
        // eslint-disable-next-line no-param-reassign
        delete instance.cache[key];
        console.log('disconnect');
      });
      return client;
    } catch (e) {
      // @ts-ignore
      // eslint-disable-next-line no-param-reassign
      delete instance.cache[key];
      throw e;
    }
  }

  /**
   * @inheritdoc
   */
  protected free(instance: Instance): void {
    instance.instance.app.stop();
  }
}

const pool = new DubboPool();

export const getDubboPool = pool.getPool.bind(pool);
