/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
/* eslint-disable no-template-curly-in-string */
/* eslint-disable camelcase */
/* eslint-disable @typescript-eslint/no-unused-vars */
// @ts-nocheck
import { CONTROLLER_TYPE, EXECUTE_EVENTS } from '@/core/enum';
import { DispatchData, ExecuteData, EXECUTE_MODE } from '@/dispatch';
import { ASSIGNMENT } from '@/assignment';
import { ASSERT } from '@/assert';
import { DATASET_FIELDS_MODE } from '@/core/enum/data-set';
import { JSON_TYPE } from '@/utils/json-schema';
import { httpServer, dataSource, server, browser } from '@/dev/data/server';

import { HTTPControllerData } from '@plugin/http/types/data';
import { DubboControllerData } from '@plugin/dubbo/types/data';
import { T2ControllerData } from '@plugin/t2/types/data';
import { GRPCControllerData } from '@plugin/grpc/types/data';
import { MySQLControllerData } from '@plugin/mysql/types/data';
import { MSSQLControllerData } from '@plugin/mssql/types/data';
import { RedisControllerData } from '@plugin/redis/types/data';
import { MongoDBControllerData } from '@plugin/mongodb/types/data';
import { OracleDBControllerData } from '@plugin/oracledb/types/data';
import { PostgreSQLControllerData } from '@plugin/postgresql/types/data';
import { ComponentControllerData } from '@plugin/component/types/data';
import { ConditionControllerData } from '@plugin/condition/types/data';
import { LoopControllerData } from '@plugin/loop/types/data';
import { PollControllerData } from '@plugin/poll/types/data';
import { DataSetControllerData } from '@plugin/data-set/types/data';
import { ScriptControllerData } from '@plugin/script/types/data';
import { SleepControllerData } from '@plugin/sleep/types/data';
import { TCPControllerData } from '@plugin/tcp/types/data';
import { BrowserControllerData } from '@plugin/browser/types/data';

type SingleControllerDataGroup =

  HTTPControllerData |DubboControllerData | T2ControllerData |
  MySQLControllerData | RedisControllerData | MongoDBControllerData | OracleDBControllerData | MSSQLControllerData |
  PostgreSQLControllerData |
  ScriptControllerData | SleepControllerData |
  TCPControllerData | BrowserControllerData;

type CombinationControllerDataGroup =
  ComponentControllerData | ConditionControllerData | LoopControllerData | PollControllerData | DataSetControllerData;

type ControllerData = SingleControllerDataGroup | CombinationControllerDataGroup;

const createHTTPStep = (url: string): HTTPControllerData => {
  const u = new URL(url);
  return {
    type: CONTROLLER_TYPE.HTTP,
    method: 'GET',
    path: u.pathname,
    hostname: u.host,
    // @ts-ignore
    protocol: u.protocol.substring(u.protocol.length - 1, -1),
    config: {
      methodRewriting: false,
      // timeout: 200,
      // retry: 3
    },
  };
};

const GRPC_STEP: GRPCControllerData = {
  type: CONTROLLER_TYPE.GRPC,
  serverId: 'grpc',
  proto: 'demo.proto',
  package: 'grpc.channelz.v1',
  service: 'Channelz',
  method: 'GetServer',
  message: { server_id: '123456789' },
  // metadata: [
  //   { key: 'key1', value: 'value1' },
  //   // { key: 'key1', value: 'value1' },

  // ],
};

const TCP_STEP: ControllerData = {
  type: CONTROLLER_TYPE.TCP,
  data: 'GET / HTTP/1.1\r\n\r\n',
  host: '10.0.2.6',
  port: 80,
  encode: `
    // const a = require('123')
    // throw new Error('123')
    // console.log(data);
    return data;
  `,
  checkEOF: `
    return true;
  `,
  decode: `
  console.log(data.toString('utf-8'))
    // 解析一个简单的HTTP协议
    const headers = [];
    let top = '';
    let body = '';
    let topEOF = false;
    data.forEach(char => {
      if (!topEOF) {
        top += String.fromCharCode(char);
        if (char === 0x0a) topEOF = true;
      }
    })
    console.log([top,
      headers,
      body])
    return {
      top,
      headers,
      body,
    };
  `,
};

const TCP_DNS_QUERY = {
  type: CONTROLLER_TYPE.TCP,
  // data: 'GET / HTTP/1.1\r\nconnection:close\r\nhost:10.0.2.6\r\n\r\n',
  // data: 'GET / HTTP/1.1\r\nconnection:keep-alive\r\nhost:10.0.2.6\r\n\r\n',
  // data: Buffer.from('GET / HTTP/1.1\r\n\r\n'),
  encode: `
  const headers = Buffer.alloc(12);
  // Transaction ID
  headers.writeUInt16BE(0)
  // Flags: 0x0100 Standard query
  //         0... .... .... .... = Response: Message is a query
  //         .000 0... .... .... = Opcode: Standard query (0)
  //         .... ..0. .... .... = Truncated: Message is not truncated
  //         .... ...1 .... .... = Recursion desired: Do query recursively
  //         .... .... .0.. .... = Z: reserved (0)
  //         .... .... ...0 .... = Non-authenticated data: Unacceptable
  headers.writeUInt16BE(parseInt('0000000100000000', 2), 2)
  // Questions: 1
  headers.writeUInt16BE(1, 4)
  // Answer RRs: 0
  headers.writeUInt16BE(0, 6)
  // Authority RRs: 0
  headers.writeUInt16BE(0, 8)
  // Additional RRs: 0
  headers.writeUInt16BE(0, 10)

  const body = Buffer.alloc(data.length + 2 + 4);
  let offset = 0;
  data.split('.').forEach((item, index) => {
    body.writeUint8(item.length, offset);
    body.write(item, offset + 1);
    offset += item.length +1;
  })
  body.writeUint8(0, offset);
  body.writeUint16BE(1, offset + 1);
  body.writeUint16BE(1, offset + 3);

  const message = Buffer.concat([ headers, body ]);
  const len = Buffer.alloc(2);
  len.writeUInt16BE(message.length);
  return Buffer.concat([ len, message ])
  `,
  data: 'www.baidu.me', // 查询的域名
  host: '1.1.1.1', // dns 服务器
  // port: 53,
  port: 853, // dns over tls
  tls: true,
  checkEOF: `
    const len = data.readUint16BE();
    console.log(data.length, len)

    if (data.length >= len) {
      return true;
    }
  `,
  decode: `
    function int2iP(num) {
      const ip = [
          (num >>> 24) >>> 0,
          ((num << 8) >>> 24) >>> 0,
          (num << 16) >>> 24,
          (num << 24) >>> 24,
      ]
      return ip.join('.')
    }

    let offset = 14;
    while (true) {
      const len = data.readUint8(offset);
      offset++;
      if (len > 0) {
        offset = offset + len;
      } else {
        break;
      }
    }
    offset = offset + 4;
    const result = [];
    while (true) {
      offset = offset + 2 + 2 + 2 + 4;
      const type = data.readUint16BE(offset - 4 - 2 - 2);
      const len = data.readUint16BE(offset);
      offset = offset + 2;
      if (type === 1) {
        if (len === 4) {
          const int = data.readUint32BE(offset);
          result.push(int2iP(int));
          console.log('ipv4', int2iP(int));
        } else {
          console.log(len)
          const bigint = data.readBigInt64BE(offset);
          result.push(bigint);
          console.log('ipv6', bigint);
        }
      } else {
        console.log('type:', type, 'len:', len);
      }
      offset = offset + len;
      if (offset >= data.length) {
        break;
      }
    }
    console.log(result)
    return result;
  `,
  assignment: [
    { var: 'errmsg', method: ASSIGNMENT.JSON, params: { content: '${RESULT_DATA}', path: '[4]' } },
    { var: 'data', method: ASSIGNMENT.GET, params: { content: '${RESULT_DATA[4]}' } },
  ],
  assert: [
    // { fn: ASSERT.COMPARE, source: '${test}', target: '10.11.23.78' },
    // { fn: ASSERT.COMPARE, source: '${RESPONSE_BODY}', target: '中文' },
    // { fn: 1, source: '${RESPONSE_CODE}', target: '403' },
    // { fn: 0, source: '${RESPONSE_CODE}', target: '200' },
    { fn: ASSERT.NOT_EXIST, source: '${errmsg}' },
    { fn: ASSERT.NOT_EXIST, source: '${data}' },
    // { fn: ASSERT.COLLECTION, source: '1', target: '[1,2,3]' },
    // { fn: 10, source: '2', target: '5' },
    // { fn: 0, source: '${_index}', target: '10' },
  ],

};

const TCO_LONG = {
  type: CONTROLLER_TYPE.TCP,
  // encode: `
  // return Buffer.from('fffb01fffb1f', 'hex');
  // `,
  data: '',
  host: '192.168.1.1',
  port: 23,
  // tls: true,
  checkEOF: `
    // console.log(send)
    // send("1");
    console.log(data)
    // return true;
  `,
};

const POSTGRESQL_STEP: ControllerData = {
  type: CONTROLLER_TYPE.POSTGRESQL,
  // command: 'UPDATE [hello].[dbo].[Table_1] SET [name] = N\'中文  2      \' WHERE [id] = 3',
  command: 'SELECT * FROM "public"."hello" LIMIT 1000 OFFSET 0',
  // command: 'INSERT INTO "public"."hello" ("id", "name") VALUES (2, \'333\')',
  // command: 'DELETE FROM "public"."hello" WHERE "id" = 2;',
  // command: `
  // INSERT INTO [hello].[dbo].[Table_1] ([id], [name]) VALUES (7, N'12345')
  // `,
  serverId: 'postgresql',
};

const MSSQL_STEP: ControllerData = {
  type: CONTROLLER_TYPE.MSSQL,
  // command: 'UPDATE [hello].[dbo].[Table_1] SET [name] = N\'中文  2      \' WHERE [id] = 3',
  command: 'SELECT * FROM [hello].[dbo].[Table1]',
  // command: `
  // INSERT INTO [hello].[dbo].[Table_1] ([id], [name]) VALUES (7, N'12345')
  // `,
  serverId: 'MSSQL',
};

const T2_STEP: ControllerData = {
  type: CONTROLLER_TYPE.T2,
  options: {
    functionNo: 338000,
  },
  serverId: 't23',
};

const DUBBO_STEP: ControllerData = {
  type: CONTROLLER_TYPE.DUBBO,
  interface: 'com.demo.ycz.service.DemoService',
  method: 'sayHello',
  // version: '1.0.0',
  // group?: string;
  serverId: 'zookeeper2',
  /** 比较特别 一会解释 */
  params: [
    {
      $class: 'java.lang.Long',
      $data: '-8',
    },
    {
      $class: 'java.lang.String',
      $data: 'abc',
    },
  ],
};

const SLEEP_STEP: ControllerData = {
  type: CONTROLLER_TYPE.SLEEP,
  sleep: 100,
};

const HTTP_UPLOAD_EXCEL = {
  method: 'POST',
  type: CONTROLLER_TYPE.HTTP,
  path: '/api/tools/excel',
  hostname: '10.0.2.2',
  protocol: 'http',
  port: 80,
  params: [
    { key: 'd', value: '${errmsg}' },
    { key: 'a', value: '1' },
    { key: 'b', value: '中文' },
    { key: 'c', value: '++++   ++01' },
  ],
  headers: [
    { key: 'content-type', value: 'multipart/form-data' },
  ],
  preScript: [
    {
      type: 1,
      timeout: 2000,
      script: `
      const xlsx = require('xlsx');

      // 创建一个 workbook
      const workbook = xlsx.utils.book_new();
      // 创建一个 sheet
      const sheet = xlsx.utils.json_to_sheet([
        [1, 2, 3, 4, 5, 6, 7, 2], // 第一行
        ['aa', 'bb'], // 第二行
      ], { skipHeader: true });
      // 将 worksheet 添加到 workbook
      xlsx.utils.book_append_sheet(workbook, sheet, 'sheet1');
      // 导出成 buffer
      const buffer = xlsx.write(workbook, { bookType: 'xls', type: 'buffer' });

      // console.log(xlsx)
      const formData = pre.getFormData();
      formData.append("file", {
          content: buffer,
          filename: new Date().getTime() + ".xlsx",
      });

      var www = xlsx.read(buffer)

`,
    },
  ],
};

const SCRIPT_STEP: ControllerData = {
  type: CONTROLLER_TYPE.SCRIPT,
  script: `
  // console.log(123456)
  // await sys.sleep(4000)
  // const moment = require('moment')
  // console.log(moment(). add(1, 'months').format('YYYY-MM-DD HH:mm:ss'))


  // const zlib = require("zlib");

  // const a = new Promise((resolve, reject) => {
  //   zlib.brotliCompress('hello world', {
  //     params: {
  //       [zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_TEXT,
  //       [zlib.constants.BROTLI_PARAM_QUALITY]: 4, // zlib.constants.BROTLI_MAX_QUALITY,
  //     },
  //   }, (err, ret) => {
  //     if (!err) {
  //       resolve(ret)
  //     } else {
  //       // reject(err);
  //     }
  //   });
  // })
  // a.then(() => {
  //   console.log(123)
  // })

  // const a = await sys.exec('/Users/william/Documents/1.lua')
  // console.log(a)
  const a = sys.execute('/Users/william/Documents/12.lua')
  // console.log(a)
    `,
  assert: [
    { fn: ASSERT.RANGE, source: '4', target: '[1,7]' },
  ],
};

const HTTP_STEP_methodRewriting: ControllerData = {
  type: CONTROLLER_TYPE.HTTP,
  method: 'POST',
  path: '/mock/test/api/tocean/public/pm/plan/case/assign',
  hostname: '127.0.0.1',
  protocol: 'http',
  port: 3000,
  headers: [
    {
      key: 'Content-Type',
      value: 'application/json',
    },
  ],
  config: {
    // methodRewriting: false,
    // timeout: 200,
    // retry: 3
  },
};

const HTTP_STEP_S1: ControllerData = {
  type: CONTROLLER_TYPE.HTTP,
  method: 'GET',
  path: '/',
  hostname: 'api.williamchan.me',
  protocol: 'https',
  port: 10443,
  config: {
    // timeout: 1,
    retry: 3,
  },
  preScript: [
    {
      type: 1,
      timeout: 2000,
      script: `
        sys.set('helloworld', '12345')
      `,
    },
  ],
};

const HTTP_STEP_S2: ControllerData = {
  type: CONTROLLER_TYPE.HTTP,
  method: 'GET',
  path: '/{id}',
  hostname: 'api.williamchan.me',
  protocol: 'https',
  port: 10443,
  pathInfo: [
    {
      key: 'id',
      value: '${helloworld}',
    },
  ],
  config: {
    // timeout: 1,
    retry: 3,
  },
};

const HTTP_STEP_302: ControllerData = {
  type: CONTROLLER_TYPE.HTTP,
  method: 'POST',
  path: '/api/tools/redirect',
  hostname: '10.0.2.2',
  protocol: 'http',
  params: [
    { key: 'count', value: '1' },
  ],
  preScript: [
    {
      type: 1,
      timeout: 2000,
      script: `
      console.log("12345")
      312alp
      `,
    },
  ],
};

const HTTP_STEP_GBK: ControllerData = {
  type: CONTROLLER_TYPE.HTTP,
  method: 'GET',
  path: '/',
  hostname: 'www.qq.com',
  protocol: 'https',
  params: [
    { key: 'test', value: '中文' },
  ],
  config: {
    timeout: 10,
    http2: true,
    rejectUnauthorized: false,
    encoding: 'gb2312',
  },
};

const HTTP_STEP_RETRY: ControllerData = {
  type: CONTROLLER_TYPE.HTTP,
  method: 'GET',
  path: '/500',
  hostname: 'mock.codes',
  // hostname: 'www.baidu.com',

  protocol: 'https',
  params: [
    { key: 'count', value: '1' },
  ],
  config: {
    timeout: 2000,
    retry: 1,
  },
};

const HTTP_STEP: ControllerData = {
  type: CONTROLLER_TYPE.HTTP,
  method: 'GET',
  path: '/api/tools/test/{a}',
  // path: '/api/multi-requests',
  // path: '/api/tools/xocean/{c}/{a}/   ++',
  // path: '/api/tools/xocean',
  // hostname: 'api.williamchan.me',
  hostname: '10.0.2.2',
  // hostname: 'www.taobao.com',
  protocol: 'http',
  // protocol: 'https',
  // port: 10443,
  config: {
    encoding: 'gbk',
    // http2: true,
    retry: 5,
    // timeout: 20,
  },
  mock: {
    hostname: 'www.baidu.com',
    protocol: 'https',
    path: '/abcdef',
  },
  // port: 3389,
  preScript: [
    {
      type: 1,
      timeout: 2000,
      script: `

      // const headers = pre.getHeaders();
      // headers.forEach((v, k) => {
      //   console.log(v, k)
      // })

      // const chunk = require("lodash/chunk")
      // console.log(chunk(['a', 'b', 'c', 'd'], 2));
      // console.log({a: 123});
      // console.log([1,2,3,4,5]);
      const a = {}
      a.b = a
      // console.log(a)
      // console.log(new ArrayBuffer(9));
      // class A extends Error {
      //   name =  'hello';
      // }
      // const a = new A("hello world!");;
      // console.log(a)
      // console.log(undefined)
      // console.log(null)
      // throw a
      `,
    },
    // {
    //   type: 'JavaScript',
    //   timeout: 2000,
    //   script: `
    //   const {
    //     scrypt,
    //     randomFill,
    //     createCipheriv
    //   } = require('crypto');

    //   const algorithm = 'aes-192-cbc';
    //   const password = 'Password used to generate key';

    //   // First, we'll generate the key. The key length is dependent on the algorithm.
    //   // In this case for aes192, it is 24 bytes (192 bits).
    //   scrypt(password, 'salt', 24, (err, key) => {
    //     console.log(123)
    //     if (err) throw err;
    //     // Then, we'll generate a random initialization vector
    //     randomFill(new Uint8Array(16), (err, iv) => {
    //       if (err) throw err;

    //       // Once we have the key and iv, we can create and use the cipher...
    //       const cipher = createCipheriv(algorithm, key, iv);

    //       let encrypted = '';
    //       cipher.setEncoding('hex');

    //       cipher.on('data', (chunk) => encrypted += chunk);
    //       cipher.on('end', () => sys.set("testxx", encrypted));

    //       cipher.write('some clear text data');
    //       cipher.end();
    //     });
    //   });
    //   `,
    // },
  ],
  // postScript: [
  //   {
  //     type: 1,
  //     timeout: 2000,
  //     script: `
  //       // console.log("world")
  //       // ps = null
  //       // const url = ps.setProtocol('http');
  //       var header = post.getHeaders();

  //       console.log(header)
  //     `,
  //   },
  // ],
  params: [
    { key: 'a', value: '1' },
    { key: 'a', value: '1' },
    { key: 'b', value: '中文' },
    { key: 'c', value: '++++   ++01' },
  ],
  pathInfo: [
    { key: 'a', value: '1' },
    { key: 'a', value: '中文 ++ ' },
    { key: 'c', value: '1234' },
  ],
  headers: [
    { key: 'content-type', value: 'application/json' },
    { key: 'Accept', value: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9' },
    { key: 'Connection', value: 'keep-alive' },
    { key: 'user-agent', value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.101 Safari/537.36' },
    { key: 'a', value: '${testxx}' },
    { key: 'cookie', value: 'application/json2' },
    { key: 'cookie', value: 'application/json2' },
    { key: 'cookie', value: 'appli' },
    { key: 'cookie', value: 'applica' },
  ],
  // form: [
  //   { key: 'bug', value: '中文' },
  // ],
  // formData: [
  //   // { name: 'file[]', filename: 'package.json', content: fs.readFileSync('/Users/william/Documents/engine/client/package.json') },
  //   { name: 'file[]', filename: 'a.7z', content: '1234\n' },
  //   { name: 'file[]', filename: 'a.png', content: '${content}' },
  // ],
  body: [
    {
      method: 'GET',
      uri: 'user/profile',
      data: {},
    },
    {
      method: 'GET',
      uri: 'user/profile',
      data: {},
    },
    {
      method: 'GET',
      uri: 'user/profile',
      data: {},
    },
    {
      method: 'GET',
      uri: 'user/profile',
      data: {},
    },
  ],
  assignment: [
    { var: 'title', method: ASSIGNMENT.HTML, params: { content: '${RESPONSE_BODY}', path: 'title', expression: ['text'] } },
    // { var: 'errmsg', method: ASSIGNMENT.JSON, params: { content: '${RESPONSE_BODY}', path: 'errmsg' } },
    // { var: 'data', method: ASSIGNMENT.GET, params: { content: '${RESPONSE_BODY.data}' } },
    {
      var: 'test',
      method: ASSIGNMENT.REGEXP,
      params: {
        content: '${RESPONSE_BODY}',
        exp: '((2(5[0-5]|[0-4]\\d))|[0-1]?\\d{1,2})(\\.((2(5[0-5]|[0-4]\\d))|[0-1]?\\d{1,2})){3}',
      },
    },
  ],
  assert: [
    // { fn: ASSERT.COMPARE, source: '${test}', target: '10.11.23.78' },
    // { fn: ASSERT.COMPARE, source: '${RESPONSE_BODY}', target: '中文' },
    // { fn: 1, source: '${RESPONSE_CODE}', target: '403' },
    // { fn: 0, source: '${RESPONSE_CODE}', target: '200' },
    // { fn: 0, source: '${errmsg}', target: '${errmsg}' },
    // { fn: ASSERT.COLLECTION, source: '1', target: '[1,2,3]' },
    // { fn: 10, source: '2', target: '5' },
    // { fn: 0, source: '${_index}', target: '10' },
  ],
};

const JD_HTTP: ControllerData = {
  type: CONTROLLER_TYPE.HTTP,
  method: 'POST',
  path: '/api/tocean/public/compile/getDebugRemoteResult',
  hostname: '10.10.16.207',
  port: 8088,
  protocol: 'http',
  headers: [
    { key: 'content-type', value: 'application/json' },
    { key: 'test', value: '${env}' },
    { key: 'cookie', value: 'sys_token=e4e0c9943496446bb555630723ec37e0; sys_env_id=1; sys_env_code=Init' },
  ],
  body: {
    requestId: 'apiAuto_debug_1466411946845687810',
  },
};

const HTTP_STEP_JSON_SCHEMA: ControllerData = {
  type: CONTROLLER_TYPE.HTTP,
  method: 'POST',
  path: '/api/tools/xocean',
  hostname: 'api.williamchan.me',
  protocol: 'https',
  port: 10443,
  config: {
    http2: true,
    useJSONSchema: true,
  },
  jsonSchema: {
    type: JSON_TYPE.ARRAY,
    items: {
      type: JSON_TYPE.OBJECT,
      properties: {
        method: { type: JSON_TYPE.BOOLEAN },
      },
    },
  },
  body: [
    {
      method: 'GET',
      uri: 'user/profile',
      data: {},
    },
    {
      method: 'GET',
      uri: 'user/profile',
      data: {},
    },
    {
      method: 'GET',
      uri: 'user/profile',
      data: {},
    },
    {
      method: 'GET',
      uri: '${var}',
      data: {},
    },
  ],
  headers: [
    { key: 'content-type', value: 'application/json; charset=utf-8' },
  ],
};

const MYSQL_STEP: ControllerData = {
  type: CONTROLLER_TYPE.MYSQL,
  // command: '',
  // command: 'show databases',
  // command: 'select sleep(0.1);',
  // command: 'select * from test.hello;',
  // command: 'select * from tocean.test_case;',
  command: 'select hello5 from test.hello',
  // command: 'INSERT INTO `test`.`table1` (`name`) VALUES (\'33\'),(\'33\'),(\'33\')',
  // command: 'DELETE FROM `test`.`table1` WHERE `id` = 23',
  // command: 'UPDATE `test`.`table1` SET `name` = \'879\' WHERE `id` = 6',
  serverId: '测试mysql',
  assignment: [
    // {
    //   var: 'test',
    //   fn: ASSIGNMENT.JSON,
    //   params: {
    //     content: '${QUERY_RESULT}',
    //     path: '[1].hello1',
    //   },
    // },
  ],
  assert: [
    // { fn: ASSERT.COMPARE, source: '${test}', target: '44' },
    // { fn: ASSERT.COMPARE, source: '${_index}', target: '5' },
  ],
  preScript: [
    {
      type: 1,
      script: `
        const a = {}
        const b = { a }
        a.b = b
        // console.log(a)
      `,
    },
  ],
};

const ORACLEDB_STEP: ControllerData = {
  type: CONTROLLER_TYPE.ORACLEDB,
  command: 'SELECT * FROM no_example;',
  // command: 'show databases',
  // command: 'sleep 1',
  // command: 'select * from test.hello;',
  // command: 'INSERT INTO `test`.`table1` (`name`) VALUES (\'33\'),(\'33\'),(\'33\')',
  // command: 'DELETE FROM `test`.`table1` WHERE `id` = 23',
  // command: 'UPDATE `test`.`table1` SET `name` = \'879\' WHERE `id` = 6',
  serverId: '测试ORACLEDB',
  assignment: [
    // {
    //   var: 'test',
    //   fn: ASSIGNMENT.JSON,
    //   params: {
    //     content: '${QUERY_RESULT}',
    //     path: '[1].hello1',
    //   },
    // },
  ],
  assert: [
    // { func: ASSERT.COMPARE, source: '${QUERY_RESULT_LENGTH}', target: '10' },
    // { func: ASSERT.COMPARE, source: '${test}', target: '44' },
    // { fn: ASSERT.COMPARE, source: '${_index}', target: '5' },
  ],
};

const REDIS_STEP: ControllerData = {
  type: CONTROLLER_TYPE.REDIS,
  // command: 'hgetall first_hot_page',
  command: 'HGETALL website',
  // command: 'type william',
  // command: '',
  serverId: '测试redis',
  assignment: [
    {
      var: 'test',
      method: ASSIGNMENT.JSON,
      params: {
        content: '${RESULT_DATA}',
        path: 'google',
      },
    },
  ],
  assert: [
    { fn: ASSERT.COMPARE, source: '${test}', target: 'bug' },
    { fn: ASSERT.COMPARE, source: '${RESULT_DATA.google}', target: 'bug' },
    // { fn: ASSERT.COMPARE, source: '${errmsg}', target: 'ok' },
  ],
};

const JDBC_STEP: ControllerData = {
  type: CONTROLLER_TYPE.JDBC,
  command: 'select * from test2',
  serverId: 'impala',
};

const REDIS_LUA_STEP: ControllerData = {
  type: CONTROLLER_TYPE.REDIS,
  // command: 'hgetall first_hot_page',
  command: 'eval "local a = 1" 1 1',
  // command: 'set "ab" ${@cname}',
  // command: 'type william',
  serverId: '测试redis',
};

const MONGODB_STEP: ControllerData = {
  type: CONTROLLER_TYPE.MONGODB,
  command: 'db.a.find()',
  // command: 'db.getCollection("a").update( { _id: ObjectId("60f8ed0e2f331705d201e3ca") }, { $set: { c: UUID("0c234567-89ab-cdef-0123-456789abcdef") } } )',
  serverId: '测试 mongodb',
  // assignment: [
  //   {
  //     var: 'test',
  //     fn: ASSIGNMENT.JSON,
  //     params: {
  //       content: '${RESULT_DATA}',
  //       path: 'google',
  //     },
  //   },
  // ],
  assert: [
    { fn: ASSERT.COMPARE, source: '${RESULT_DATA[4].c}', target: '9c234567-89ab-cdef-0123-456789abcdef' },
    { fn: ASSERT.COMPARE, source: '${RESULT_DATA[0]._id}', target: '60f862162f331705d201e3c8' },
    // { fn: ASSERT.COMPARE, source: '${errmsg}', target: 'ok' },
  ],
};

const MONGODB2_STEP: ControllerData = {
  type: CONTROLLER_TYPE.MONGODB,
  command: 'console.log(123)',
  serverId: '测试 mongodb2',
};

const CONDITION_STEP: ControllerData = {
  type: CONTROLLER_TYPE.CONDITION,
  condition: '1 === 2',
  steps: [
    [
      HTTP_STEP,
    ],
    [
      MYSQL_STEP,
    ],
  ],
};

const POLL_STEP: ControllerData = {
  type: CONTROLLER_TYPE.POLL,
  interval: 500,
  maxCount: 99,
  config: {
    // PRE_ERROR = 1 << 1,
    // POST_ERROR = 1 << 2,
    // EXECUTE_ERROR = 1 << 3,
    // RESPONSE_ERROR = 1 << 4, // http 4xx dubbo exception 会用 ExecuteError 封装
    // ASSIGNMENT_ERROR = 1 << 5,
    // ASSERT_ERROR = 1 << 6,
    // SYSTEM_ERROR = 1 << 7,
    breakError: 1 << 1,
  },
  steps: [
    CONDITION_STEP,
  ],
};

const DATASET_STEP: ControllerData = {
  type: CONTROLLER_TYPE.DATASET,
  fields: [
    // { name: 'name', mode: DATASET_FIELDS_MODE.DATA_SOURCE, field: 'id', required: false },
    { name: 'link', mode: DATASET_FIELDS_MODE.CSV, field: 'link' },
    // { name: 'id', mode: DATASET_FIELDS_MODE.MOCK, method: '@dataImage' },
  ],
  // dataSource: {
  //   command: 'select * from table1;',
  //   serverId: '测试mysql',
  // },
  csv: {
    '@file': 'https://public.williamchan.me:10443/movie_comments.csv',
  },
  config: {
    ignoreError: true,
    maxCount: 400000,
    async: true,
  },
  steps: [
    // REDIS_STEP,
    {
      type: CONTROLLER_TYPE.HTTP,
      method: 'GET',
      path: '/api/tools/xocean1',
      hostname: '10.10.16.214',
      port: '8088',
      protocol: 'http',
      params: [
        { key: 'a', value: '${id}' },
        { key: 'b', value: '${name}' },
      ],
      assert: [
        // { fn: ASSERT.COMPARE, source: '${test1}', target: '1' },
      ],
    },
  ],
};

const TASK: ExecuteData = {
  mode: EXECUTE_MODE.ASYNC,
  steps: [
    // MYSQL_STEP,
    // REDIS_STEP,
    // CONDITION_STEP,
    MONGODB2_STEP,
  ],
};

const COMPONENT_STEP: ControllerData = {
  type: CONTROLLER_TYPE.COMPONENT,
  steps: [
    SCRIPT_STEP,
    // HTTP_STEP,
    // HTTP_STEP,
    // HTTP_STEP,
    // HTTP_STEP,
    // HTTP_STEP,
    // HTTP_STEP,
  ],
};

const ASYNC_LOOP_STEP_VAR: ControllerData = {
  type: CONTROLLER_TYPE.LOOP,
  // data: [
  //   { test: 1, test1: 2 },
  // ],
  count: 1,
  config: {
    async: true,
  },
  steps: [
    {
      type: CONTROLLER_TYPE.SCRIPT,
      scriptType: 1,
      script: `
        sys.set('hello', 'world');
      `,
    },
    {
      type: CONTROLLER_TYPE.SCRIPT,
      scriptType: 1,
      script: `
        console.log(sys.get('hello'));
      `,
    },
  ],
};

const ASYNC_STEP_VAR_TEST: ControllerData = {
  type: CONTROLLER_TYPE.SCRIPT,
  scriptType: 1,
  script: `
    if (sys.get('hello') !== 'world') {
      throw new Error('test')
    }
  `,
};

const LOOP_STEP: ControllerData = {
  type: CONTROLLER_TYPE.LOOP,
  count: 31,
  config: {
    async: true,
  },
  steps: [
    TCP_DNS_QUERY,
    // SLEEP_STEP,
    // SLEEP_STEP,
    SCRIPT_STEP,
    REDIS_STEP,
    // HTTP_STEP_JSON_SCHEMA,
    // {
    //   type: CONTROLLER_TYPE.HTTP,
    //   method: 'GET',
    //   path: '/api/tools/xocean',
    //   hostname: '10.0.2.2',
    //   protocol: 'http',
    //   headers: [
    //     { key: 'a_c', value: 'foo=bac' },
    //   ],
    // },
    // SLEEP_STEP,
    // SCRIPT_STEP,
    // MYSQL_STEP,

    // MONGODB_STEP,

    // REDIS_STEP,
    // COMPONENT_STEP,
    // CONDITION_STEP,
    // POLL_STEP,
    // DATASET_STEP,
    // HTTP_STEP,
  ],
};

const RABBITMQ_STEP: ControllerData = {
  type: CONTROLLER_TYPE.RABBITMQ,
  mode: 1,
  // exchange: {
  //   name: 'test',
  //   type: 'topic',
  // },
  exchangeName: 'test',
  routingKey: 'tkey',
  serverId: '测试rabbitmq',
  content: 'hello',
  queue: 'RABBITMQ',
};

const HTTP_UPLOAD: ControllerData = {
  method: 'POST',
  type: CONTROLLER_TYPE.HTTP,
  path: '/api/tools/xocean',
  hostname: '10.0.2.2',
  protocol: 'http',
  port: 80,
  headers: [
    { key: 'content-type', value: 'multipart/form-data' },
    { key: 'user-agent', value: 'engine' },
  ],
  formData: [
    {
      name: 'release',
      value: '1',
    },
    {
      name: 'imgList[0].img',
      filename: 'ca.key',
      // '@file': 'https://xyq.gdl.netease.com/MHXY-JD-3.0.387.exe',
      '@file': 'https://public.williamchan.me:10443/cert-music/ca.key',
    },
    {
      name: 'imgList[1].img',
      filename: 'ca.key',
      // '@file': 'https://xyq.gdl.netease.com/MHXY-JD-3.0.387.exe',
      '@file': 'https://public.williamchan.me:10443/cert-music/ca.key',
    },
  ],
};

const GLOBAL_VAR_EXECUTE: ExecuteData[] = [
  {
    mode: EXECUTE_MODE.SYNC,
    events: EXECUTE_EVENTS.PROGRESS | EXECUTE_EVENTS.STDERR | EXECUTE_EVENTS.STDOUT,
    steps: [
      {
        type: CONTROLLER_TYPE.SCRIPT,
        scriptType: 1,
        script: `
          sys.setEnvVariable('hello', 'world')
          sys.set('hello', 'world2')
        `,
        assert: [{ fn: ASSERT.COMPARE, source: '${hello}', target: 'world2' }],
      },
    ],
  },
  {
    mode: EXECUTE_MODE.SYNC,
    events: EXECUTE_EVENTS.PROGRESS | EXECUTE_EVENTS.STDERR | EXECUTE_EVENTS.STDOUT,
    steps: [
      {
        type: CONTROLLER_TYPE.SCRIPT,
        scriptType: 1,
        script: '',
        assert: [{ fn: ASSERT.COMPARE, source: '${hello}', target: 'world' }],
      },
    ],
  },
];

const DUBBO_STEP_dimensionaltwo: ControllerData = {
  type: CONTROLLER_TYPE.DUBBO,
  interface: 'com.demo.dubbox.service.DemoService',
  method: 'getUser',
  serverId: 'zookeeper2',
  params: [
    {
      $class: 'com.demo.dto.UserDTO',
      $data: {
        updateDate: {
          date: {
            year: 2022,
            month: 8,
            dayOfMonth: 26,
          },
          time: {
            hour: 14,
            minute: 34,
            second: 16,
            nanoOfSecond: 793000000,
          },
        },
        address: {
          $class: 'com.demo.dto.AddressDTO',
          $data: {
            city: '中国杭州',
          },
        },
        name: '张三',
        colorMap: {
          RED: {
            $class: 'com.demo.dto.ColorDTO',
            $data: {
              rgb: '#888888',
            },
          },
          YELLOW: {
            $class: 'com.demo.dto.ColorDTO',
            $data: {
              rgb: '#EEEEEE',
            },
          },
        },
        age: {
          $class: 'java.lang.Long',
          $data: '666',
        },
        colorList: [
          {
            $class: 'com.demo.dto.ColorDTO',
            $data: {
              rgb: '#000000',
            },
          },
          {
            $class: 'com.demo.dto.ColorDTO',
            $data: {
              rgb: '#FFFFFF',
            },
          },
        ],
        createDate: {
          $class: 'java.util.Date',
          $data: 1661495656793,
        },
      },
    },
    {
      $class: 'java.util.List<com.demo.dto.AddressDTO>',
      $data: [
        {
          $class: 'com.demo.dto.AddressDTO',
          $data: {
            city: '江苏南京',
          },
        },
        {
          $class: 'com.demo.dto.AddressDTO',
          $data: {
            city: '江苏苏州',
          },
        },
      ],
    },
  ],

};

const T: ExecuteData[] = [];
for (let index = 0; index < 1000; index++) {
  T.push(TASK);
}

const INTERACT_EXECUTE: ControllerData[] = [
  {
    type: CONTROLLER_TYPE.SLEEP,
    sleep: 100,
    interact: [{
      var: 'url',
      type: 'string',
      content: '请输入你要访问的网站',
    }],
  },
  {
    type: CONTROLLER_TYPE.SCRIPT,
    scriptType: 1,
    script: `
      const url = sys.get('url');
      if (url.substring(0, 4) !== 'http') {
        sys.set('url', 'http://' + url);
      }
      // console.log(url);
      `,
    config: {
      timeout: 8000,
    },
  },
  // {
  //   type: CONTROLLER_TYPE.SLEEP,
  //   sleep: 100,
  //   interact: [{
  //     type: 'confirm',
  //     content: '请问你是要访问 ${url} 吗？',
  //   }],
  // },
  {
    type: CONTROLLER_TYPE.HTTP,
    method: 'GET',
    path: '/api/multi-requests',
    hostname: 'api.williamchan.me',
    protocol: 'https',
    port: 10443,
    config: {
      // http2: true,
      retry: 5,
      // timeout: 20,
    },
    // port: 3389,
    preScript: [
      {
        type: 1,
        timeout: 2000,
        script: `
          const url = sys.get('url');
          const urlManager = pre.getURLManager();
          urlManager.setUrl(url);
        `,
      },
    ],
    headers: [
      { key: 'content-type', value: 'application/json' },
      { key: 'Accept', value: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9' },
      { key: 'Connection', value: 'keep-alive' },
      { key: 'user-agent', value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.101 Safari/537.36' },
    ],
    assignment: [
      { var: 'title', method: ASSIGNMENT.HTML, params: { content: '${RESPONSE_BODY}', path: 'title', expression: ['text'] } },
    ],
    assert: [
      // { fn: 0, source: '${errmsg}', target: '${errmsg}' },
    ],
  },
  {
    type: CONTROLLER_TYPE.SLEEP,
    sleep: 100,
    interact: [
      {
        type: 'confirm',
        content: '网站标题是 ${title} 你觉得这个用例执行的正确吗？',
      },
    ],
  },
];

const debugData: DispatchData = {
  env: {
    name: 'test',
    variable: {
      key: { hello: 123 },
      env: 'variable',
    },
    httpServer,
    dataSource,
    server,
    browser,
  },
  retry: 3,
  // execute: GLOBAL_VAR_EXECUTE,
  // execute: T,
  // execute: [
  //   {
  //     mode: EXECUTE_MODE.SYNC,
  //     events: EXECUTE_EVENTS.STDERR | EXECUTE_EVENTS.STDOUT | EXECUTE_EVENTS.PRINT_STDOUT | EXECUTE_EVENTS.PRINT_STDERR,
  //     steps: [
  //       {
  //         type: CONTROLLER_TYPE.SLEEP,
  //         sleep: 5000,
  //       },
  //     ],
  //   },
  //   {
  //     mode: EXECUTE_MODE.ASYNC,
  //     events: EXECUTE_EVENTS.STDERR | EXECUTE_EVENTS.STDOUT | EXECUTE_EVENTS.PRINT_STDOUT | EXECUTE_EVENTS.PRINT_STDERR,
  //     steps: [
  //       {
  //         type: CONTROLLER_TYPE.SLEEP,
  //         sleep: 1000,
  //       },
  //     ],
  //   },
  //   {
  //     mode: EXECUTE_MODE.ASYNC,
  //     events: EXECUTE_EVENTS.STDERR | EXECUTE_EVENTS.STDOUT | EXECUTE_EVENTS.PRINT_STDOUT | EXECUTE_EVENTS.PRINT_STDERR,
  //     steps: [
  //       {
  //         type: CONTROLLER_TYPE.SLEEP,
  //         sleep: 1000,
  //       },
  //     ],
  //   },
  //   {
  //     mode: EXECUTE_MODE.SYNC,
  //     events: EXECUTE_EVENTS.STDERR | EXECUTE_EVENTS.STDOUT | EXECUTE_EVENTS.PRINT_STDOUT | EXECUTE_EVENTS.PRINT_STDERR,
  //     steps: [
  //       {
  //         type: CONTROLLER_TYPE.SLEEP,
  //         sleep: 1000,
  //       },
  //     ],
  //   },
  // ],
  execute: [
    {

      variable: {
        var: '{"code":"success","data":"gqmp-gqns-audit-sit.test.geely.com/#/basicCarType?appCode=PROD_PRCS_AUDIT&token=9bc6085f-e4c9-4f6b-a780-dc8cfac5b198&siteCode=1001&languageCode=zh","message":"API调用成功"}',
      },
      mode: EXECUTE_MODE.ASYNC,
      events: EXECUTE_EVENTS.PROGRESS
      | EXECUTE_EVENTS.STDERR
      | EXECUTE_EVENTS.STDOUT
      | EXECUTE_EVENTS.PRINT_STDOUT
      | EXECUTE_EVENTS.PRINT_STDERR,
      // | EXECUTE_EVENTS.IGNORE_EXECUTE_ERROR,
      browsers: [
        { id: 'chrome-linux', width: 1920, height: 1080 },
        { id: 'chrome-linux', width: 1024, height: 768 },
        // { id: 'chrome-linux', width: 777, height: 777 },
        // { id: 'chrome-linux', width: 777, height: 777 },
        // { id: 'chrome-linux', width: 777, height: 777 },

      ],
      steps: [
        // HTTP_UPLOAD_EXCEL,
        // RABBITMQ_STEP,
        // JDBC_STEP,
        // MONGODB_STEP,
        // GRPC_STEP,
        // GRPC_STEP,
        // HTTP_STEP_GBK,
        // HTTP_UPLOAD,
        // HTTP_UPLOAD_EXCEL,
        // TCO_LONG,
        // ...INTERACT_EXECUTE,
        // {
        //   type: CONTROLLER_TYPE.HTTP,
        //   hostname: 'mp-qa.ebanma.com',
        //   port: 20016,
        //   method: 'POST',
        //   path: '/app-mp/vp/1.0/requestStopHeatedSeat',
        //   protocol: 'https',
        // },
        // createHTTPStep('https://www.qq.com'),
        // createHTTPStep('https://www.bilibili.com'),
        // createHTTPStep('https://www.weibo.com'),
        // createHTTPStep('https://www.qq.com'),
        // createHTTPStep('https://www.163.com'),
        // {
        //   type: CONTROLLER_TYPE.BROWSER,
        //   command: 'await browser.url("https://www.qq.com")',
        // },
        // {
        //   type: CONTROLLER_TYPE.BROWSER,
        //   command: 'await browser.url("https://www.baidu.com")',
        // },
        // JD_HTTP,
        // POSTGRESQL_STEP,
        // MSSQL_STEP,
        // T2_STEP,
        // {
        //   type: CONTROLLER_TYPE.LOOP,
        //   count: 200,
        //   config: {
        //     async: false,
        //   },
        //   steps: [
        //     ORACLEDB_STEP,
        //   ],
        // },
        // DUBBO_STEP_dimensionaltwo,
        // DUBBO_STEP2,
        // DUBBO_STEP3,
        // DUBBO_STEP3,
        // HTTP_STEP_methodRewriting,
        // HTTP_STEP_S1,
        // HTTP_STEP_S2,
        // HTTP_STEP_302,
        // HTTP_STEP_RETRY,
        // HTTP_STEP_JSON_SCHEMA,
        // HTTP_UPLOAD,
        // {
        //   type: CONTROLLER_TYPE.HTTP,
        //   method: 'GET',
        //   path: '/api/tools/xocean',
        //   hostname: 'www.163.com',
        //   protocol: 'http',
        //   headers: [
        //     { key: 'a_c', value: 'foo=bac' },
        //   ],
        // },
        // SLEEP_STEP,
        // TCP_DNS_QUERY,
        // SSH,
        // DATASET_STEP,
        // SCRIPT_STEP,
        // DUBBO_STEP,
        // MYSQL_STEP,
        // HTTP_UPLOAD,
        // SLEEP_STEP,
        // MONGODB_STEP,
        // MONGODB2_STEP,
        // // ORACLEDB_STEP,
        // REDIS_STEP,
        // COMPONENT_STEP,
        // CONDITION_STEP,
        // POLL_STEP,
        // DATASET_STEP,
        // LOOP_STEP,
        // REDIS_STEP,
        // REDIS_LUA_STEP,
        // HTTP_STEP,
        SCRIPT_STEP,
        // HTTP_STEP_methodRewriting,
        // ASYNC_LOOP_STEP_VAR,
        // ASYNC_STEP_VAR_TEST,
        // LOOP_STEP,
        // ASYNC_LOOP_STEP_VAR,
        // {
        //   type: CONTROLLER_TYPE.LOOP,
        //   count: 1,
        //   config: {
        //     async: false,
        //   },
        //   steps: [
        //     TCP_DNS_QUERY,
        //   ],
        // },

        // {
        //   type: CONTROLLER_TYPE.TZT,
        //   data: {
        //     a: 1235,
        //   },
        //   host: '10.0.2.6',
        //   port: '80',
        // },
        // {
        //   type: CONTROLLER_TYPE.HTTP,
        //   method: 'GET',
        //   path: '/api/user/debug/1',
        //   hostname: '10.0.2.2',
        //   protocol: 'http',
        //   postScript: [
        //     { script: 'console.log(1235)' },
        //   ],
        //   headers: [
        //     { key: 'cookie', value: 'test' },
        //   ],
        //   params: [
        //     { key: 'redirect_uri', value: 'http://10.0.2.6' },
        //   ],
        // },
      ],
    },
  ],
};
export default debugData;
