/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
// @ts-nocheck
import { DATA_SOURCE_TYPE } from '@/core/enum';
import { HTTPServer, Server, SERVER_TYPE } from '@/dispatch/types/server';
import { DataSource } from '@/dispatch/types/data-source';
import { Browser } from '@/dispatch/types/browser';

export const httpServer: HTTPServer[] = [
  {
    serverId: 'hello',
    hostname: 'www.163.com',
    protocol: 'https',
    port: 443,
    headers: [
      { key: 'hello', value: 'hello' },
    ],
  },
];
export const dataSource: DataSource[] = [
  {
    type: DATA_SOURCE_TYPE.ZOOKEEPER,
    host: '192.168.101.140',
    port: 2181,
    serverId: 'zookeeper',
  },
  {
    type: DATA_SOURCE_TYPE.ZOOKEEPER,
    host: '10.10.16.214',
    port: 2181,
    serverId: 'zookeeper2',
  },
  {
    type: DATA_SOURCE_TYPE.MYSQL,
    host: '10.0.2.2',
    user: 'test',
    password: '123456',
    // user: 'root',
    // password: 'chenwei',
    serverId: '测试mysql',
    config: {
      database: 'test',
      charset: 'utf8mb4_unicode_ci',
    },
  },

  {
    type: DATA_SOURCE_TYPE.MYSQL,
    host: '192.168.111.153',
    user: 'root',
    password: '123456',
    port: 8066,
    // user: 'root',
    // password: 'chenwei',
    serverId: '测试mysql2',
    config: {
      database: 'TESTMA',
    },
  },

  {
    type: DATA_SOURCE_TYPE.MYSQL,
    host: '192.168.111.153',
    port: 3309,
    user: 'root',
    password: '123456',
    serverId: '测试mysql-remote',
    // config: {
    //   database: 'test',
    // },
  },
  {
    type: DATA_SOURCE_TYPE.MONGODB,
    host: '10.0.2.2',
    user: 'root',
    password: 'chenwei',
    serverId: '测试 mongodb',
    // config: {
    //   database: 'test',
    // },
  },
  {
    type: 3,
    host: '10.10.221.102',
    user: 'testma',
    password: 'testma',
    serverId: '测试 mongodb2',
    config: {
      database: 'testma',
      authSource: 'admin',
    },
  },
  {
    type: DATA_SOURCE_TYPE.REDIS,
    host: '10.0.2.2',
    // user: 'root',
    // password: 'chenwei',
    serverId: '测试redis',
  },
  {
    type: DATA_SOURCE_TYPE.REDIS,
    host: 'midware.dev.perfma-inc.com',
    // user: 'root',
    password: 'Admin888.',
    serverId: '测试redis2',
  },
  {
    type: DATA_SOURCE_TYPE.ORACLEDB,
    host: '10.0.0.81',
    // host: '10.0.0.18',
    user: 'WILLIAM',
    password: 'chenwei',
    serverId: '测试ORACLEDB',
  },
  {
    type: DATA_SOURCE_TYPE.MSSQL,
    host: '10.0.0.11',
    user: 'sa',
    password: '@@chenwei123',
    serverId: 'MSSQL',
    config: {
      database: 'hello',
    },
  },
  {
    type: DATA_SOURCE_TYPE.POSTGRESQL,
    host: '10.0.0.8',
    user: 'postgres',
    password: 'postgres',
    serverId: 'postgresql',
    // config: {
    //   database: 'hello',
    // },
  },
  {
    type: DATA_SOURCE_TYPE.REDIS,
    host: 'tinngenn.synology.me',
    port: 26379,
    serverId: 'sentinel-redis',
    config: {
      sentinelName: 'mymaster',
    },
  },
  {
    type: DATA_SOURCE_TYPE.JDBC,
    subType: 'IMPALA',
    host: '10.10.31.32',
    port: 21050,
    user: 'root',
    password: 'Perfma888.',
    serverId: 'impala',
    config: {
      database: 'default',
    },
    options: {
      k: 'v',
    },
    files: {
      file1: {
        '@file': 'https://dss0.bdstatic.com/5aV1bjqh_Q23odCf/static/superman/img/topnav/newzhidao-da1cf444b0.png',
        ext: 'png',
      },
    },
  },
  {
    type: DATA_SOURCE_TYPE.RABBITMQ,
    host: '10.0.0.8',
    port: 5672,
    serverId: '测试rabbitmq',
  },
];

export const server: Server[] = [
  {
    type: SERVER_TYPE.T2,
    host: '121.41.138.11',
    port: 9869,
    serverId: 't2',
    config: {
      license: {
        cert: {
          '@file': 'https://public.williamchan.me:10443/t2/dev_license.dat',
        },
      },
      encoding: 1,
    },
  },
  {
    type: SERVER_TYPE.GRPC,
    host: '10.0.2.6',
    port: 10001,
    serverId: 'grpc',
    // tls: true,
    // tlsOptions: {
    //   ca: { '@file': 'https://public.williamchan.me:10443/grpc/ca.crt' },
    //   cert: { '@file': 'https://public.williamchan.me:10443/grpc/client.crt' },
    //   key: { '@file': 'https://public.williamchan.me:10443/grpc/client.key' },
    // },
    proto: [
      { '@file': 'https://public.williamchan.me:10443/grpc/demo.proto', '@fileKey': 'demo.proto', version: 3 },
      { '@file': 'https://public.williamchan.me:10443/grpc/import.proto', '@fileKey': 'import.proto', version: 3 },
    ],
  },
];

export const browser: Browser[] = [
  {
    id: 'chrome2',
    browserName: 'chrome',
    protocol: 'webdriver',
  },
  {
    id: 'chrome-windows',
    browserName: 'chrome',
    protocol: 'webdriver',
    // hostname: '10.0.2.6',
    hostname: '10.0.0.11',
  },
  {
    id: 'chrome-linux',
    browserName: 'chrome',
    protocol: 'webdriver',
    // hostname: '10.0.2.6',
    hostname: '10.0.0.8',
  },
  {
    id: 'safari',
    browserName: 'safari',
    protocol: 'webdriver',
  },
  {
    id: 'firefox',
    browserName: 'firefox',
    protocol: 'webdriver',
  },
];
