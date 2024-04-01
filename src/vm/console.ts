/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { performance } from 'node:perf_hooks';
import { encodeContentType, ContentType, CONTENT_TYPE } from '@/utils/serialize/type';

export enum LOG_LEVEL {
  INFO = 1,
  WARN = 2,
  ERROR = 128,
  DEBUG = 255,
}

export interface ConsoleData {
  level: LOG_LEVEL;
  logs: ContentType[];
}

/**
 * VMConsole console 实现
 * @author William Chan <root@williamchan.me>
 */
export default class VMConsole {
  private timestamp: Record<string, number> = {};
  private logs: ConsoleData[] = [];

  /**
   * constructor
   * @param logs
   */
  public constructor(logs: ConsoleData[] = []) {
    this.logs = logs;
  }

  private process(level: LOG_LEVEL, ...args: unknown[]): void {
    const logs: ContentType[] = [];
    args.forEach((data) => {
      const dat = encodeContentType(data);
      if (dat.type === CONTENT_TYPE.ERROR) {
        // 前端打印的是这个
        dat.content.stack = `${dat.content.name}: ${dat.content.message}`;
      }
      try {
        logs.push(JSON.parse(JSON.stringify(dat)));
      } catch (error) {
        logs.push(dat);
      }
    });
    this.logs.push({ level, logs });
  }

  public log(...args: any[]): void {
    this.process(LOG_LEVEL.INFO, ...args);
  }

  public info(...args: any[]): void {
    this.process(LOG_LEVEL.INFO, ...args);
  }

  public dir(...args: any[]): void {
    this.process(LOG_LEVEL.INFO, ...args);
  }

  public warn(...args: any[]): void {
    this.process(LOG_LEVEL.WARN, ...args);
  }

  public error(...args: any[]): void {
    this.process(LOG_LEVEL.ERROR, ...args);
  }

  public debug(...args: any[]): void {
    this.process(LOG_LEVEL.DEBUG, ...args);
  }

  public time(str: string): void {
    this.timestamp[str] = performance.now();
  }

  public timeEnd(str: string): void {
    const time = this.timestamp[str];
    if (time) {
      this.logs.push({
        level: LOG_LEVEL.INFO,
        logs: [encodeContentType(`${str}: ${performance.now() - time}ms`)],
      });
    }
  }
}
