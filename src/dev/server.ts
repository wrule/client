/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-unused-vars */
// @ts-nocheck

import sio from 'socket.io-client';
import crypto from 'node:crypto';
import fs from 'node:fs';
import repl from 'repl';
import { createServer } from '@/server';
import Logger from '@/logger';
import debugData from '@/dev/data';
import { CONTROLLER_TYPE, DATA_SOURCE_TYPE, EXECUTE_EVENTS } from '@/core/enum';
import {
  ExecuteMessageData, ExecuteMessageEvent,
  DispatchMessage, DispatchDoneMessage, DispatchErrorMessage, DispatchSuccessMessage,
  QueryMessage, QueryErrorMessage, QueryReplyMessage,
  CancelMessage,
  CallMessage, CallErrorMessage,
} from '@/server/types';
import { encodeBrotliSync } from '@/utils/zlib';
import { DispatchData, EXECUTE_OPTIONS } from '@/dispatch';

Logger.warn('Use @swc/core build TypeScript, Do not check for type errors. @see https://github.com/swc-project/swc/issues/571');

const encodeBufferDispatch = (data: DispatchData): Buffer => {
  const protocol = Buffer.from([0xC6, 0x96, 0x3F, 0x01, 0x00, 0x00, 0x00, 0x01]);
  const context = encodeBrotliSync(JSON.stringify({ env: data.env, retry: data.retry }));
  const contextSize = Buffer.allocUnsafe(4);
  contextSize.writeUInt32BE(context.length);
  const execute: Buffer[] = [];
  data.execute.forEach((item) => {
    const headers = Buffer.allocUnsafe(8);
    const dat = encodeBrotliSync(JSON.stringify(item));
    headers.writeUInt32BE(dat.length);
    headers.writeUInt32BE(item.mode === 0 ? EXECUTE_OPTIONS.SYNC : EXECUTE_OPTIONS.ASYNC, 4);
    execute.push(headers, dat);
  });

  const debugDataBuffer = Buffer.concat([
    protocol, contextSize, context, ...execute,
  ]);
  // console.log(execute);
  return debugDataBuffer;
};

// debugDataBuffer
createServer().then(() => {
  const client = sio('ws://localhost:6419', {
    // forceBase64: false,
    transports: ['websocket'],
  });
  // console.log(debugData.execute)
  client.on('connect', () => {
    const requestId = crypto.randomUUID();
    // Logger.debug('send dispatch ...');

    // client.emit('call', {
    //   requestId: 'apiAuto_debug_datasource_connect_1550326664301506562',
    //   call: 'test-connect',
    //   params: {
    //     '@type': '254',
    //     host: '10.10.16.215',
    //     user: 'root',
    //     password: 'Perfma888.',
    //     port: 3306,
    //     config:
    //       {
    //         database: 'test',
    //       },
    //     type: 254,
    //     subType: 'OCEANBASE',
    //   },
    // });
    client.emit('dispatch', {
      // data: fs.readFileSync('./src/dev/data/1'),
      data: encodeBufferDispatch(debugData),
      requestId: 'test',
    });

    // client.emit('dispatch', {
    //   requestId: 'apiAuto_batch_time_1530086936790716418',
    //   data: 'http://10.10.16.214:9700/default/testma/timedtaskCompile/2022/05/27/1bc77611ee754ab9b2b5d26f084e84a3?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=minio%2F20220527%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20220527T072155Z&X-Amz-Expires=86400&X-Amz-SignedHeaders=host&X-Amz-Signature=e07a6d5fc13ad1d2cf023e0803f9ac4d723ef392fa423a776757f05a3110d443',
    // });

    // client.emit('dispatch', {
    //   data: encodeBufferDispatch(debugData),
    //   requestId: 'test',
    // });
    // client.emit('dispatch', {
    //   data: fs.readFileSync('/Users/william/Downloads/6deb7418-15af-4179-a3e4-d0eb359b1c0f'),
    //   requestId: 'test',
    // });

    // client.emit('dispatch', { "event": "message", "data": { "env": { "name": "开发", "httpServer": [{ "hostname": "11.22.33", "protocol": "http", "port": 9090, "serverId": "9" }, { "hostname": "127.0.0.1", "protocol": "https", "port": 8081, "serverId": "8" }] }, "execute": [{ "name": "AUTO", "id": "121415", "mode": 0, "steps": [{ "@type": "1", "id": "3939f1b4-62b7-4db2-9ad6-3ddfac328f16", "type": 1, "disabled": false, "preScript": [{ "type": 1, "script": "setTimeout(\n    ()=>{\n        console.log('a')\n    },\n    10000\n)" }], "postScript": [], "assignment": [{ "var": "a", "fn": 1, "args": ["a", "a"] }, { "var": "a", "fn": 1, "args": ["a", "a"] }], "method": "GET", "protocol": "http", "serverId": "9", "izUseEnv": true, "headers": [], "params": [], "paramsString": "", "form": [], "formData": [], "pathInfo": [], "config": { "maxRedirects": 10, "timeout": 5000, "followRedirect": true, "methodRewriting": true, "http2": false, "rejectUnauthorized": true, "retry": 1, "useJSONSchema": false }, "assert": [{ "fn": 0, "source": "a", "target": "a" }] }, { "@type": "1", "id": "5e2366bc-2bc0-46ba-98b9-f215e0c15cb8", "type": 1, "disabled": false, "preScript": [], "postScript": [], "assignment": [], "method": "GET", "protocol": "http", "izUseEnv": false, "headers": [], "params": [], "paramsString": "", "form": [], "formData": [], "pathInfo": [], "config": { "maxRedirects": 10, "timeout": 5000, "followRedirect": true, "methodRewriting": true, "http2": false, "rejectUnauthorized": true, "retry": 1, "useJSONSchema": false }, "assert": [] }, { "@type": "1", "id": "11d8adaf-ab21-44b8-98ff-465274923bd6", "type": 1, "disabled": false, "preScript": [], "postScript": [], "assignment": [], "method": "GET", "protocol": "http", "izUseEnv": false, "headers": [], "params": [], "paramsString": "", "form": [], "formData": [], "pathInfo": [], "config": { "maxRedirects": 10, "timeout": 5000, "followRedirect": true, "methodRewriting": true, "http2": false, "rejectUnauthorized": true, "retry": 1, "useJSONSchema": false }, "assert": [] }, { "@type": "1", "id": "873cc1fe-48bd-493d-aa31-9f4ee65d5661", "type": 1, "disabled": false, "preScript": [], "postScript": [], "assignment": [], "method": "GET", "protocol": "http", "izUseEnv": false, "headers": [], "params": [], "paramsString": "", "form": [], "formData": [], "pathInfo": [], "config": { "maxRedirects": 10, "timeout": 5000, "followRedirect": true, "methodRewriting": true, "http2": false, "rejectUnauthorized": true, "retry": 1, "useJSONSchema": false }, "assert": [] }, { "@type": "1", "id": "4423419d-b197-45cf-ba2e-a2f05a472854", "type": 1, "disabled": false, "preScript": [], "postScript": [], "assignment": [], "method": "GET", "protocol": "http", "izUseEnv": false, "headers": [], "params": [], "paramsString": "", "form": [], "formData": [], "pathInfo": [], "config": { "maxRedirects": 10, "timeout": 5000, "followRedirect": true, "methodRewriting": true, "http2": false, "rejectUnauthorized": true, "retry": 1, "useJSONSchema": false }, "assert": [] }], "events": 11 }] }, "requestId": "0a20f03c-3f69-44c5-b172-f48d3750b40a" });

    // client.emit('dispatch', {
    //   data: debugData,
    //   requestId,
    // });

    setTimeout(() => {
      // client.emit('dispatch', {
      //   data: encodeBufferDispatch(debugData),
      //   requestId: 'test2',
      // });
      // client.emit('cancel', {
      //   requestId: 'test',
      // });
      // client.emit('query', {
      //   requestId: 'test',
      //   query: 'detail',
      //   params: {
      //     executeId: 0,
      //     stepId: 0,
      //   },
      // } as QueryMessage);

      // client.emit('interact', {
      //   requestId: 'test',
      //   params: {
      //     executeId: 0,
      //     stepId: 0,
      //     input: ['www.google.com'],
      //   },
      // });
    }, 3000);
    // if (debugData.env.dataSource && debugData.env.dataSource[10]) {
    //   client.emit('call', {
    //     call: 'test-connect',
    //     requestId: 'dev',
    //     params: debugData.env.dataSource[10],
    //   });
    // }

    // client.emit('call', {
    //   call: 'test-dataset',
    //   requestId: 'dev',
    //   params: {
    //     data: debugData.execute[0].steps[0],
    //     dataSource: debugData.env.dataSource,
    //   },
    // });
  });
  client.on('call', (data) => {
    // console.log(data);
  });
  client.on('disconnect', () => {
    console.debug('server disconnected');
  });
  client.on('error', (data) => {
    console.debug(data);
  });
  client.on('message', (data) => {
    // Logger.mark(`[message][${data.executeId}][${data.event}]`);
    // console.debug(data);
  });
  client.on('info', (data) => {
    // console.log(data);
  });
  client.on('dispatch', (data: DispatchDoneMessage | DispatchErrorMessage | DispatchSuccessMessage) => {
    Logger.mark('[dispatch]');
    // console.log(data);
  });
  client.on('query', (data) => {
    Logger.mark('[query]');
    // console.log(data);
  });
  // global.query = (data: any): void => {
  //   client.emit('query', data)
  // };
  // const server = repl.start({
  //   useGlobal: true,
  // })
  // process.stdin.on('data', (chunk) => {
  //   const value = chunk.toString('utf-8');
  //   try {
  //     const data = JSON.parse(value);
  //     if (data.env && data.execute) {
  //       client.emit('dispatch', {
  //         data,
  //         requestId: 'stdio',
  //       });
  //     }
  //   } catch (e) {
  //     console.error(e);
  //   }
  // });
});

// kill on exit, debugger attach hot reload
process.removeAllListeners();

// const answer: string[] = [];

// hold process for devtools
// eslint-disable-next-line @typescript-eslint/no-empty-function
setInterval(() => { }, 1 << 30);
