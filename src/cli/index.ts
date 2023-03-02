/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
/* eslint-disable no-console */
/** 测试使用 简易 stdin 流执行 */
import fs from 'node:fs';
import { EXECUTE_EVENTS } from '@/core/enum';
import { opts } from '@/config';
import Dispatch from '@/dispatch';
import { ExecuteMessageData } from '@/server/types';
import Logger from '@/logger';
import { DispatchData } from '@/dispatch/types';

const readRawFile = async (): Promise<DispatchData | Buffer> => new Promise((resolve, reject) => {
  fs.fstat(process.stdin.fd, (err: NodeJS.ErrnoException | null, stats: fs.Stats) => {
    try {
      if (stats && stats.size > 0) {
        let content = Buffer.alloc(0);
        Logger.info('[execute] execute data for stdin');
        process.stdin.on('data', (data) => {
          content = Buffer.concat([content, data]);
        });
        process.stdin.once('end', () => {
          try {
            const data: DispatchData = JSON.parse(content.toString('utf-8'));
            resolve(data);
          } catch (e) {
            resolve(content);
          }
        });
      } else {
        Logger.info(`[execute] execute data for ${opts.input}`);
        const file = fs.readFileSync(opts.input);
        try {
          const executeData: DispatchData = JSON.parse(file.toString('utf-8'));
          resolve(executeData);
        } catch (e) {
          resolve(file);
        }
      }
    } catch (e) {
      reject(e);
    }
  });
});

const processError = (err: Error): void => {
  Logger.error(err.message);
  console.error(err.stack);
  process.exit(1);
};

/**
 * 简易命令行执行
 */
const execute = async (): Promise<void> => {
  try {
    const executeData = await readRawFile();
    return new Promise((resolve) => {
      try {
        let queue = 1;
        const done = (): void => {
          queue--;
          if (queue === 0) {
            resolve();
            process.exit(0);
          }
        };
        if (!fs.existsSync(opts.output)) {
          fs.mkdirSync(opts.output);
        }
        if (!Buffer.isBuffer(executeData)) {
          if (executeData.execute.length === 1) {
            // 强制修改单用例的输出日志
            // @ts-ignore
            executeData.execute[0].events = (executeData.execute[0].events || 0)
            | EXECUTE_EVENTS.PRINT_STDERR
            | EXECUTE_EVENTS.PRINT_STDOUT;
          }
        }
        Dispatch.create(executeData).then((instance) => {
          instance.on('message', (data: ExecuteMessageData) => {
            if (data.event === 'done') {
              queue++;
              fs.writeFile(`${opts.output}/${data.executeId}.xengine`, data.data, done);
            }
          });
          instance.once('done', done);
          process.on('SIGINT', () => {
            instance.cancel();
          });
          instance.dispatch();
        }).catch((err) => {
          processError(err);
        });
      } catch (err) {
        processError(err);
      }
    });
  } catch (e) {
    processError(e);
  }
};

export default execute;
