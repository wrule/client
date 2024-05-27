/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
/* eslint-disable no-console */
import { program } from 'commander';
import fs from 'node:fs';
import { createServer } from '@/server';
import Logger from '@/logger';
import { getSystemInfo } from '@/utils/info';
import { opts, CONFIG } from '@/config';
import execute from '@/cli';
import { ENGINE_VERSION } from '@/utils';
import VM from '@/vm';

// 下个版本去掉
require('oracledb');
require('node-t2sdk');

if (opts.printConfig) {
  console.log(CONFIG);
}

process.title = 'XEngine';

// process.stdout.write(`
//  Welcome to XEngine!

//  ,ggg,          ,gg   ,ggggggg,
//  dP"""Y8,      ,dP'  ,dP""""""Y8b
//  Yb,_  "8b,   d8"    d8'    a  Y8
//  \`""    Y8,,8P'     88     "Y8P'                            gg
//           Y88"       \`8baaaa                                 ""
//          ,888b      ,d8P""""       ,ggg,,ggg,     ,gggg,gg   gg    ,ggg,,ggg,    ,ggg,
//         d8" "8b,    d8"           ,8" "8P" "8,   dP"  "Y8I   88   ,8" "8P" "8,  i8" "8i
//       ,8P'    Y8,   Y8,           I8   8I   8I  i8'    ,8I   88   I8   8I   8I  I8, ,8I
//      d8"       "Yb, \`Yba,,_____, ,dP   8I   Yb,,d8,   ,d8I _,88,_,dP   8I   Yb, \`YbadP'
//    ,8P'          "Y8  \`"Y8888888 8P'   8I   \`Y8P"Y8888P"8888P""Y88P'   8I   \`Y8888P"Y888
//                                                       ,d8I'
//                                                     ,dP'8I
//                                                    ,8"  8I
//                                                    I8   8I
//                                                    \`8, ,8I
//                                                     \`Y8P"
//  --------------------------------------------------------------------------------------
//  XEngine ${ENGINE_VERSION} (git-${process.env.GIT_COMMIT}) BuildID ${process.env.BUILD_TIME}
//  --------------------------------------------------------------------------------------
// \n`);
console.log('[🐥 小黄鸭调试法欢迎你]');
if (opts.help) {
  program.help();
}
const info = getSystemInfo();
Logger.mark(`[logger] log-level=${Logger.level}`);
Logger.info(`Node.js: ${info.node}`);
Logger.info(`platform: ${info.platform}`);
Logger.info(`cpu: ${info.cpu} x ${info.cpus}`);
Logger.info(`user: ${info.username}(${info.uid})`);
Logger.info(`pid: ${info.pid}`);
Logger.info(`tmpdir: ${info.tmpdir}`);
Logger.info(`cwd: ${process.cwd()}`);
Logger.info('mem=%sGB, thread=%d', (info.totalmem / 1024 / 1024 / 1024).toFixed(2), info.maxWorker);

const debugScript = `
let a = {
  b: 1,
  c: undefined,
};

&&&

console.log(a);

a.d = 2;
`;

// VM.spawn(debugScript.trim());

// async function main() {
//   const b = await executeScript([{
//     type: PROCESS_SCRIPT_TYPE.PRE_AND_POST,
//     script: debugScript,
//   }]);
//   console.log(1124, b);
// }

// main();

// nodejs 中 process.stdin.fd 永远是 0 写死的既定规则
// 但是 windows cmd 和 PowerShell 在没有重定向 stdin 并不一定百分百是 0
// std 是标准库 但是 stdin fd 由 shell 提供 所以并不一定是一样
// 直接获取会报错 所以需要特殊处理
fs.fstat(process.stdin.fd, (err: NodeJS.ErrnoException | null, stats: fs.Stats) => {
  if ((stats && stats.size > 0) || opts.input) {
    execute();
  } else {
    createServer();
  }
});
