/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { isMainThread } from 'node:worker_threads';
import { program, InvalidArgumentError } from 'commander';
import { ENGINE_VERSION, isDeveloper } from '@/utils';

const cpus = os.cpus();

program.name('XEngine');
program.description('A high-performance automated test execution engine');
program.version(`XEngine/${ENGINE_VERSION} (git-${process.env.GIT_COMMIT})
Node ${process.version}
Build ${process.env.BUILD_USER || os.userInfo().username}@${process.env.BUILD_HOST || os.hostname()} (${process.env.BUILD_TIME})`);

program.option('--print', 'print all config');
// change working directory
program.option('--chdir <string>', 'change working directory');

// server
program.option('-h, --host <string>', 'ws listen host', '127.0.0.1');

program.option('-p, --port <number>', 'ws listen port', (port) => {
  const p = Number(port);
  if (p <= 0 || p > 0xffff) {
    throw new InvalidArgumentError('Unreasonable port range.');
  }
  return p;
}, 6419);

program.option('--token <string>', 'security key');

program.option('--max-exec-thread <number>', 'maximum execution thread', (n) => {
  const c = Number(n);
  if (c <= 0 || c > 0xff) {
    throw new InvalidArgumentError('Unreasonable range.');
  }
  return c;
}, Math.floor(Math.min(os.cpus().length * 2.5, (Math.floor(os.totalmem() / 1024 / 1024 / 1024)) * 1.8) >>> 0 || 1));

program.option('--max-async-thread <number>', 'maximum async thread', (n) => {
  const c = Number(n);
  if (c <= 0 || c > 0xff) {
    throw new InvalidArgumentError('Unreasonable range.');
  }
  return c;
}, cpus[0] ? Math.max(16, (cpus[0].speed < 100 ? cpus[0].speed : cpus[0].speed / 100) >>> 0) : 16);

program.option('--exec-thread-timeout <ms>', 'thread execution timeout', (n) => {
  const c = Number(n);
  if (c <= 0) {
    throw new InvalidArgumentError('Unreasonable range.');
  }
  return c;
}, 10 * 60 * 1000);

program.option('--idle-thread-timeout <ms>', 'thread idle timeout', (n) => {
  const c = Number(n);
  if (c <= 0) {
    throw new InvalidArgumentError('Unreasonable range.');
  }
  return c;
}, 30 * 60 * 1000);

program.option('--connect-timeout <ms>', 'all protocol socket connection timeout', (n) => {
  const c = Number(n);
  if (c <= 0) {
    throw new InvalidArgumentError('Unreasonable range.');
  }
  return c;
}, 5 * 1000);

program.option('--vm-timeout <ms>', 'script vm default timeout', (n) => {
  const c = Number(n);
  if (c <= 0) {
    throw new InvalidArgumentError('Unreasonable range.');
  }
  return c;
}, 5 * 1000);

program.option('--log-level <info|warn|error|debug>', 'log level', (n) => {
  if (!['info', 'warn', 'error', 'debug'].includes(n)) {
    throw new InvalidArgumentError('Unreasonable range.');
  }
  return n;
}, isDeveloper ? 'debug' : 'info');

program.option('-L, --lib <path>', 'dynamic library path', (n) => {
  if (!fs.existsSync(n)) {
    throw new InvalidArgumentError('dynamic library path does not exist.');
  }
  return n;
}, process.cwd());

program.option('--input <file>', 'execute from the input file', (n) => {
  if (!fs.existsSync(n)) {
    throw new InvalidArgumentError('file does not exist.');
  }
  return n;
});

program.option('--output <path>', 'execute result output path', (n) => {
  if (!fs.existsSync(n)) {
    throw new InvalidArgumentError('output path does not exist.');
  }
  return n;
}, 'engine_output');

program.option('--jdbc-service-host <string>', 'jdbc service host', '127.0.0.1');

program.option('--jdbc-service-port <number>', 'jdbc service port', (port) => {
  const p = Number(port);
  if (p <= 0 || p > 0xffff) {
    throw new InvalidArgumentError('Unreasonable port range.');
  }
  return p;
}, 9123);

// ------------------------------------ MOCK ------------------------------------
program.option('--mock', 'enable mock server mode');

program.option('--mock-config <path>', 'mock use json config', (n) => {
  if (!fs.existsSync(n)) {
    throw new InvalidArgumentError('file does not exist.');
  }
  return n;
});

program.option('--mock-http-host <string>', 'mock listen host', '0.0.0.0');

program.option('--mock-http-port <number>', 'mock listen port', (port) => {
  const p = Number(port);
  if (p <= 0 || p > 0xffff) {
    throw new InvalidArgumentError('Unreasonable port range.');
  }
  return p;
}, 3000);

program.option('--mock-control-host <string>', 'mock control listen host', '127.0.0.1');
program.option('--mock-control-port <number>', 'mock control listen port', (port) => {
  const p = Number(port);
  if (p <= 0 || p > 0xffff) {
    throw new InvalidArgumentError('Unreasonable port range.');
  }
  return p;
}, 3001);

program.parse();

export const opts = program.opts();

// thread not support change directory
// so we change directory before create thread

if (opts.chdir && isMainThread) {
  process.chdir(path.resolve(opts.chdir));
}
