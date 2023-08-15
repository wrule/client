/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { opts } from '@/config/argv';
import { ENGINE_VERSION } from '@/utils';

export { opts } from '@/config/argv';

const CONNECTED_TIMEOUT = opts.connectTimeout;

export const CONFIG = {
  /**
   * Math.min(os.cpus().length * 2.5, (Math.floor(os.totalmem() / 1024 / 1024 / 1024)) * 1.8) >>> 0 || 1
   */
  WORKER_MAX_COUNT: opts.maxExecThread,
  // WORKER_MAX_COUNT = 1;
  /** 一个用例最多跑十分钟 */
  WORKER_EXEC_TIMEOUT: opts.execThreadTimeout,
  /** 线程5分钟没用上 释放掉 */
  WORKER_IDLE_TIMEOUT: opts.idleThreadTimeout,
  /** 一些支持并发执行任务的最大执行组单元，这个值目前测试下来比较合理 */
  MAX_ASYNC_EXEC_GROUP: opts.maxAsyncThread,
  // MAX_ASYNC_EXEC_GROUP: 5,

  /**
   * HTTP
   */
  HTTP_DEFAULT_HEADERS: {
    // 'User-Agent': `XEngine/${ENGINE_VERSION}`,
    // 'X-Engine': ENGINE_VERSION,
    Accept: '*/*',
    'Accept-Encoding': 'gzip, deflate, br',
    'Cache-Control': 'no-cache',
  },

  HTTP_DEFAULT_CONNECT_TIMEOUT: CONNECTED_TIMEOUT,
  HTTP_DEFAULT_MAX_REDIRECTS: 10,
  HTTP_DEFAULT_RETRY: 1,
  /**
   * Defines if redirect responses should be followed automatically.

  * Note that if a `303` is sent by the server in response to any request type (`POST`, `DELETE`, etc.), Got will automatically request the resource pointed to in the location header via `GET`.
  * This is in accordance with [the spec](https://tools.ietf.org/html/rfc7231#section-6.4.4).
  * @default true
  */
  HTTP_DEFAULT_FOLLOW_REDIRECT: true,
  /**
   * By default, redirects will use [method rewriting](https://tools.ietf.org/html/rfc7231#section-6.4).
   * For example, when sending a POST request and receiving a `302`, it will resend the body to the new location using the same HTTP method (`POST` in this case).

  * @default true
  */
  HTTP_DEFAULT_METHOD_REWRITING: true,

  /**
   * @see https://dev.mysql.com/doc/refman/8.0/en/charset.html
   */
  MYSQL_DEFAULT_CHARSET: 'utf8mb4_general_ci',
  MYSQL_DEFAULT_CONNECT_TIMEOUT: CONNECTED_TIMEOUT,
  MYSQL_DEFAULT_COMMAND_TIMEOUT: 5000,
  MYSQL_DEFAULT_TIMEZONE: 'local', // 毫无意义 不需要做处理的
  MYSQL_DEFAULT_PORT: 3306,

  /**
   * @see https://redis.io/documentation
   */
  REDIS_DEFAULT_PORT: 6379,
  REDIS_DEFAULT_CONNECT_TIMEOUT: CONNECTED_TIMEOUT,
  REDIS_DEFAULT_COMMAND_TIMEOUT: 5000,

  /**
   * @see https://docs.mongodb.com/
   */
  MONGODB_DEFAULT_PORT: 27017,
  MONGODB_DEFAULT_CONNECT_TIMEOUT: CONNECTED_TIMEOUT,
  MONGODB_DEFAULT_COMMAND_TIMEOUT: 5000,
  MONGODB_DEFAULT_APP_NAME: `XEngine ${ENGINE_VERSION}`,

  /**
   * MSSQL
   */
  MSSQL_DEFAULT_PORT: 1433,
  MSSQL_DEFAULT_CONNECT_TIMEOUT: CONNECTED_TIMEOUT,
  MSSQL_DEFAULT_COMMAND_TIMEOUT: 5000,

  /**
   * RABBITMQ
   */
  RABBITMQ_DEFAULT_PORT: 5672,
  RABBITMQ_DEFAULT_CONNECT_TIMEOUT: CONNECTED_TIMEOUT,
  RABBITMQ_DEFAULT_COMMAND_TIMEOUT: 5000,

  /**
   * POSTGRESQL
   */
  POSTGRESQL_DEFAULT_PORT: 5432,
  POSTGRESQL_DEFAULT_CONNECT_TIMEOUT: CONNECTED_TIMEOUT,
  POSTGRESQL_DEFAULT_COMMAND_TIMEOUT: 5000,

  /**
   * oracledb
   */
  ORACLEDB_DEFAULT_PORT: 1521,
  ORACLEDB_DEFAULT_CONNECT_TIMEOUT: CONNECTED_TIMEOUT,

  /**
   * JDBC_DEFAULT_CONNECT_TIMEOUT
   */
  JDBC_DEFAULT_CONNECT_TIMEOUT: CONNECTED_TIMEOUT,

  /**
   * DataSet
   */
  DATASET_DEFAULT_MAX_COUNT: 200,

  /**
   * ZooKeeper
   */
  ZOOKEEPER_DEFAULT_PORT: 2181,
  ZOOKEEPER_DEFAULT_APP_NAME: `XEngine ${ENGINE_VERSION}`,
  ZOOKEEPER_DEFAULT_CONNECT_TIMEOUT: CONNECTED_TIMEOUT,

  /**
   * dubbo
   */
  DUBBO_DEFAULT_INVOKE_TIMEOUT: CONNECTED_TIMEOUT,
  /** 请求时间 */
  DUBBO_DEFAULT_TIMEOUT: 5000,

  /**
   * T2
   */
  T2_DEFAULT_CONNECT_TIMEOUT: CONNECTED_TIMEOUT,
  T2_DEFAULT_TIMEOUT: 5000,

  /** GRPC */
  GRPC_DEFAULT_METADATA: {
    'User-Agent': `XEngine/${ENGINE_VERSION}`,
  },
  GRPC_DEFAULT_TIMEOUT: 5000,

  /**
   * tcp
   */
  TCP_DEFAULT_CONNECT_TIMEOUT: CONNECTED_TIMEOUT,

  /**
   * 浏览器步骤默认超时时间
   */
  BROWSER_DEFAULT_TIMEOUT: 60000,

};

export interface Config {
  WORKER_MAX_COUNT: number;
  WORKER_EXEC_TIMEOUT: number;
}

/**
 * 重载配置
 * @param config
 */
export const reload = (conf: Config): void => {
  Object.assign(CONFIG, conf);
};
