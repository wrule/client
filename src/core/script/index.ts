/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { VMError } from '@/vm/error';
import VM from '@/vm';
import { cycle } from '@/utils/serialize';
import { CONTENT_TYPE } from '@/utils/serialize/type';
import { ConsoleData } from '@/vm/console';
import { isDeveloper } from '@/utils';
import { opts } from '@/config';

/**
 * 预处理类型
 */
export enum PROCESS_SCRIPT_TYPE {
  /** 常规预处理脚本 */
  PRE_AND_POST = 1,
  /** 检查协议结束（拆包） */
  PROTOCOL_CHECK_EOF = 2,
  /** 协议解包 */
  PROTOCOL_DECODE = 3,
  /** 协议封包 */
  PROTOCOL_ENCODE = 4,
}

export interface ProcessScriptResultError {
  message: string;
  stack?: string;
}

export interface ProcessScriptResult {
  type: PROCESS_SCRIPT_TYPE;
  script: string;
  logs: ConsoleData[];
  totalTime: number;
  /** 是否跳过，前端变灰 */
  skip: boolean;
  timeout?: number;
  error?: ProcessScriptResultError;
  // return?: any;
}

export interface CommonScript {
  readonly scriptId: string;
  readonly script: string;
}

export interface ProcessScriptInclude {
  readonly scriptId: string;
}

export interface ProcessScript {
  /** 预处理脚本类型 -1 代表无所谓 */
  readonly type: PROCESS_SCRIPT_TYPE;
  readonly include?: ProcessScriptInclude[];
  /** 超时间就默认5s 5000 */
  readonly timeout?: number;
  readonly script: string;
}

interface ExecuteScriptConfig {
  context?: Record<string, any>;
  commonScript?: CommonScript[];
}

/**
 * 检查消除循环依赖
 * @param {ConsoleData[]} logs
 * @returns {ConsoleData[]}
 */
const checkCycle = (logs: ConsoleData[]): ConsoleData[] => logs.map((log: ConsoleData): ConsoleData => ({
  level: log.level,
  logs: log.logs.map((l) => {
    if (l.type === CONTENT_TYPE.OBJECT) {
      return { type: l.type, content: cycle(l.content) };
    }
    return l;
  }),
}));

/**
 * execute script
 * @param scripts
 * @param context
 * @returns {Promise<ScriptResult[]>}
 */
export const executeScript = async (scripts: ProcessScript[] = [], config: ExecuteScriptConfig = {}): Promise<ProcessScriptResult[]> => {
  const result: ProcessScriptResult[] = [];
  if (scripts.length) {
    let skip = false;
    for (let index = 0; index < scripts.length; index++) {
      const item = scripts[index];
      let script = item.script;
      if (item.include?.length) {
        const ss: string[] = [];
        item.include.forEach((include) => {
          const commonScriptItem = config.commonScript?.find((s) => s.scriptId === include.scriptId);
          if (commonScriptItem && commonScriptItem.script) {
            ss.push(commonScriptItem.script);
          }
        });
        if (ss.length) {
          script = `${ss.join('\n')}\n${script}`;
        }
      }
      const data = { type: item.type, script, logs: [], totalTime: 0, skip: false, timeout: item.timeout } as ProcessScriptResult;
      if (skip === false) {
        try {
          /** @todo type */
          const ret = await VM.spawn(data.script, {
            context: config.context,
            timeout: scripts[index].timeout,
            debug: isDeveloper || opts.logLevel === 'debug',
            async: true,
          });
          data.logs = checkCycle(ret.logs);
          data.totalTime = ret.totalTime;
          // data.return = ret.return; 暂时不加 又要处理用户依赖问题
        } catch (e) {
          if (e instanceof VMError) {
            data.logs = checkCycle(e.data.logs);
            data.totalTime = e.data.totalTime;
          }
          data.error = { message: e.message, stack: e.stack };
          skip = true;
          // if has error, jump out of the loop
        }
      } else {
        data.skip = true;
      }
      result.push(data);
    }
  }
  return result;
};
