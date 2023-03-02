/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */

import { spawn, spawnSync, SpawnSyncReturns, SpawnSyncOptionsWithBufferEncoding, ChildProcess } from 'node:child_process';
import path from 'node:path';
import { opts } from '@/config';
/**
 * execute command
 * @notice 执行太久会被 kill 当初设计时虚拟机还不支持 await
 * @fixme 现在支持了 考虑换个新名字来替换 先保持现状 也不推荐用户使用
 * @param {string} filename
 * @param {string[]} args
 * @param {Number} timeout
 * @returns
 */
export const execute = (filename: string, args: string[] = [], timeout = opts.vmTimeout): [string, SpawnSyncReturns<Buffer>] => {
  const ext = path.extname(filename);
  const options: SpawnSyncOptionsWithBufferEncoding = {
    timeout,
    encoding: 'buffer',
  };
  let result: SpawnSyncReturns<Buffer>;
  const filePath = path.resolve(filename);
  switch (ext) {
    case '.jar':
      result = spawnSync('java', ['-jar', filePath, ...args], options);
      break;
    case '.php':
      result = spawnSync('php', [filePath, ...args], options);
      break;
    case '.js':
      result = spawnSync('node', [filePath, ...args], options);
      break;
    case '.py':
      result = spawnSync('python', [filePath, ...args], options);
      break;
    case '.go':
      result = spawnSync('go', [filePath, ...args], options);
      break;
    case '.lua':
      result = spawnSync('lua', [filePath, ...args], options);
      break;
    case '.sh':
      result = spawnSync('sh', [filePath, ...args], options);
      break;
    case '.rb':
      result = spawnSync('ruby', [filePath, ...args], options);
      break;
    default:
      result = spawnSync(filePath, args, options);
      break;
  }
  if (result.error) {
    delete result.error.stack;
    throw result.error;
  }
  if (result.status !== 0) {
    const stderr = result.output.map((buf) => {
      if (buf) {
        return buf.toString('utf-8');
      }
      return buf;
    }).filter((buf) => buf).join('\n').trim();
    const err = new Error(stderr);
    delete err.stack;
    throw err;
  }
  const stdout = result.stdout.toString('utf-8');
  return [stdout, result];
};

/**
 * execute command
 * @notice 执行太久会被 kill 当初设计时虚拟机还不支持 await
 * @fixme 现在支持了 考虑换个新名字来替换 先保持现状 也不推荐用户使用
 * @param {string} filename
 * @param {string[]} args
 * @param {Number} timeout
 * @returns
 */
export const exec = async (
  filename: string,
  args: string[] = [],
  timeout: number = opts.vmTimeout,
): Promise<[string, SpawnSyncReturns<Buffer>]> => new Promise((resolve, reject) => {
  const ext = path.extname(filename);
  const options: SpawnSyncOptionsWithBufferEncoding = {
    timeout,
    encoding: 'buffer',
    stdio: [null, 'pipe', 'pipe'],
  };
  let result: ChildProcess;
  const filePath = path.resolve(filename);
  switch (ext) {
    case '.jar':
      result = spawn('java', ['-jar', filePath, ...args], options);
      break;
    case '.php':
      result = spawn('php', [filePath, ...args], options);
      break;
    case '.js':
      result = spawn('node', [filePath, ...args], options);
      break;
    case '.py':
      result = spawn('python', [filePath, ...args], options);
      break;
    case '.go':
      result = spawn('go', [filePath, ...args], options);
      break;
    case '.lua':
      result = spawn('lua', [filePath, ...args], options);
      break;
    case '.sh':
      result = spawn('sh', [filePath, ...args], options);
      break;
    case '.rb':
      result = spawn('ruby', [filePath, ...args], options);
      break;
    default:
      result = spawn(filePath, args, options);
      break;
  }
  let stdout = Buffer.alloc(0);
  let stderr = Buffer.alloc(0);
  result.on('error', (err: Error) => {
    // eslint-disable-next-line no-param-reassign
    delete err.stack;
    reject(err);
  });
  if (result.stdout) {
    result.stdout.on('data', (buf: Buffer) => {
      stdout = Buffer.concat([stdout, buf]);
    });
  }
  if (result.stderr) {
    result.stderr.on('data', (buf: Buffer) => {
      stderr = Buffer.concat([stderr, buf]);
    });
  }
  result.on('exit', (code: number) => {
    if (code !== 0) {
      if (stdout.length > 0) {
        reject(new Error(stdout.toString('utf-8').trim()));
      } else {
        reject(new Error(stderr.toString('utf-8').trim()));
      }
    } else {
      resolve([stdout.toString('utf-8'), {
        stderr,
        stdout,
        status: code,
        // @ts-ignore
        pid: result.pid,
      }]);
    }
  });
});
