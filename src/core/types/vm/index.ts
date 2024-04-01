/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { SpawnSyncReturns } from 'node:child_process';

interface GlobalSystemMethods {
  /**
   * 获取一个变量 自动处理变量优先级
   * @notice 优先级：上下文变量 > 用例变量 > 全局变量
   * @param key 变量名
   */
  get(key: string): any;
  /**
   * 设置一个上下文变量
   * @param key 变量名
   * @param value 变量值 可以为任意类型
   */
  set(key: string, value: any): void;
  /**
   * 删除一个变量
   * @param key 变量名
   */
  del(key: string): void;
  /**
   * 获取一个环境变量
   * @param key 变量名
   */
  getEnvVariable(key: string): any;
  /**
   * 设置当前执行队列中的跨环境变量
   * @notice 仅在串行执行用例时有意义 并行执行时不保证变量同步
   * @param key 变量名
   * @param value 变量值 可以为任意类型
   */
  setEnvVariable(key: string, value: any): void;
  /**
   * 睡眠一段时间
   * @notice 非特殊场景不推荐使用 会造成用例执行随机性增加
   * @example await sys.sleep(1000)
   * @param ms 毫秒数
   */
  sleep(ms: number): Promise<void>;
  /**
   * 同步等待执行外部程序（会阻塞整个执行线程）
   * @notice 任何非 0 退出码都会抛出异常
   * @deprecated 后续版本会删除请使用 await sys.exec 方法
   * @param filename 可执行文件路径
   * @param args 参数列表
   * @param timeout 超时时间
   */
  execute(filename: string, args: string[], timeout: number): [string, SpawnSyncReturns<Buffer>];
  /**
   * 异步等待执行外部程序（推荐）
   * @notice 任何非 0 退出码都会抛出异常
   * @example await sys.exec('/bin/ls', ['-l'])
   * @param filename 可执行文件路径
   * @param args 参数列表
   * @param timeout 超时时间
   */
  exec(filename: string, args: string[], timeout: number): Promise<[string, SpawnSyncReturns<Buffer>]>;

  log(...args: any[]): void;
}

export interface SystemContext {
  sys: GlobalSystemMethods;
}
export interface PreContext {
  pre: any;
  java?: any; // js-to-java;
}
export interface PostContext {
  post: any;
}
