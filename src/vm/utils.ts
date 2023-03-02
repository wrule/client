/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { VM_TAG } from '@/vm';

/**
 * 处理栈信息
 * @param name
 * @param message
 * @param stack
 * @returns {string}
 */
export const formatStackInfo = (name = '', message = '', stack = ''): string => {
  let msg = `${name}: ${message}`;
  if (stack) {
    const match = stack.match(/at Script.runInContext \(node:vm:\d+:\d+\)/);
    if (match) {
      msg = stack.slice(0, match.index).trim();
    } else {
      const match2 = stack.match(/at new Script \(node:vm:\d+:\d+\)/);
      if (match2) {
        msg = stack.slice(0, match2.index).trim();
      }
    }
  }
  return msg;
};

/**
 * 处理栈信息
 * @param name
 * @param message
 * @param stack
 * @returns {string}
 */
export const formatAsyncStackInfo = (name = '', message = '', stack = '', code: string): string => {
  let msg = `${name}: ${message}`;
  if (stack) {
    const match = stack.match(/at eval \(eval at <anonymous> \(XEngine.<VM>:\d+:\d+\), <anonymous>:(\d+):(\d+)\)/);
    if (match && match[1] && match[2]) {
      const rows = Number(match[1]) - 2;
      const columns = Number(match[2]);
      msg = [
        `${VM_TAG}:${rows}`,
        code.split('\n')[rows - 1],
        `${' '.repeat(columns - 1)}^\n`,
        msg,
        `    at ${VM_TAG}:${rows}:${columns}`,
      ].join('\n');
    } else {
      const match2 = stack.match(/at XEngine.<VM>:(\d+):(\d+)/);
      if (match2 && match2[1] && match2[2]) {
        const fragment = stack.split('\n');
        msg = [
          `${VM_TAG}:${match2[1]}`,
          fragment[1],
          `${fragment[2]}\n`,
          msg,
        ].join('\n');
      }
    }
  }
  return msg;
};
