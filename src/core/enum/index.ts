/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */

/**
 * EXECUTE STATUS
 */
export enum EXECUTE_STATUS {
  WAIT = 1,
  RUNNING = 2,
  DONE = 3,
  SKIP = 4,
  ERROR = 10,
  TIMEOUT = 11,
  CANCEL = 12,
  EXIT = 13, // 意外退出
}

/**
 * EXECUTE_EVENTS [or]
 * 其实是 flag
 */
export enum EXECUTE_EVENTS {
  /** 推送进度进度 */
  PROGRESS = 1 << 0,
  /** 推送stdout日志 调试任务可以设置 */
  STDOUT = 1 << 1,
  /** 打印stdout日志 非引擎调试不要设置 消耗性能 */
  PRINT_STDOUT = 1 << 2,
  /** 推送stderr日志 调试任务可以设置 */
  STDERR = 1 << 3,
  /** 打印stderr日志 非引擎调试不要设置 消耗性能 */
  PRINT_STDERR = 1 << 4,
  /** 用例遇到错误后继续执行到结束 并不会覆盖循环、数据集的忽略错误配置 */
  IGNORE_EXECUTE_ERROR = 1 << 5,
}

/**
 * CONTROLLER FLAG
 */
export enum CONTROLLER_FLAG {
  DISABLED = 1 << 0,
  INTERFACE = 1 << 1,
  MOCK = 1 << 2,
}

/**
 * CONTROLLER STATUS
 */
export enum CONTROLLER_STATUS {
  WAIT = 1,
  RUNNING = 2,
  DONE = 3,
  SKIP = 4,
  INTERACT = 5,
  ERROR = 10,
  // JMTEST1 = 101,
  // JMTEST2 = 102,
}

/**
 * CONTROLLER STATE
 */
export enum CONTROLLER_STATE {
  INIT = 1,
  PRE = 2,
  EXECUTE = 3,
  POST = 4,
  ASSIGNMENT = 5,
  ASSERT = 6,
  DONE = 7
}

/**
 * CONTROLLER ERROR
 */
export enum CONTROLLER_ERROR {
  GENERAL_ERROR = 1 << 0, // 似乎没用上
  PRE_ERROR = 1 << 1,
  POST_ERROR = 1 << 2,
  EXECUTE_ERROR = 1 << 3,
  RESPONSE_ERROR = 1 << 4, // http 4xx dubbo exception 会用 ExecuteError 封装
  ASSIGNMENT_ERROR = 1 << 5,
  ASSERT_ERROR = 1 << 6,
  SYSTEM_ERROR = 1 << 7,
  COMBINATION_ERROR = 1 << 8,
  INTERACT_ERROR = 1 << 9,
  UNKNOWN_ERROR = 1 << 30,
}

/**
 * CONTROLLER TYPE
 */
export enum CONTROLLER_TYPE {
  HTTP = 1,
  DUBBO = 2,
  GRPC = 3,
  MYSQL = 10,
  REDIS = 11,
  MONGODB = 12,
  ORACLEDB = 13,
  MSSQL = 14,
  POSTGRESQL = 15,
  RABBITMQ = 16,
  COMPONENT = 100,
  CONDITION = 101,
  LOOP = 102,
  POLL = 103,
  DATASET = 104,
  DATASET_CASE = 105,
  SCRIPT = 110,
  SLEEP = 111,
  TCP = 150,
  UDP = 151,
  /** 浏览器步骤 */
  BROWSER = 160,
  /** 移动设备控制步骤 iOS/Android */
  DEVICE = 161,
  /** TCP2 特殊行业定制 */
  T2 = 200,
  /** TCP3 特殊行业定制 */
  T3 = 300,
  JDBC = 254,
  TZT = 50000,
}

export const CONTROLLER_MAP = {
  1: 'HTTP', 2: 'DUBBO', 3: 'GRPC', 10: 'MYSQL', 11: 'REDIS', 12: 'MONGODB', 13: 'ORACLEDB', 14: 'MSSQL', 15: 'POSTGRESQL', 16: 'RABBITMQ', 100: 'COMPONENT', 101: 'CONDITION', 102: 'LOOP', 103: 'POLL', 104: 'DATASET', 105: 'DATASET_CASE', 110: 'SCRIPT', 111: 'SLEEP', 150: 'TCP', 151: 'UDP', 160: 'BROWSER', 161: 'DEVICE', 200: 'T2', 300: 'T3', 254: 'JDBC', 50000: 'TZT'
};

/**
 * DATA_SOURCE_TYPE
 */
export enum DATA_SOURCE_TYPE {
  MYSQL = 1,
  REDIS = 2,
  MONGODB = 3,
  ORACLEDB = 4,
  MSSQL = 5,
  POSTGRESQL = 6,
  RABBITMQ = 7,
  ZOOKEEPER = 10,
  JDBC = 254,
}

export enum INTERACT_TYPE {
  STRING = 'string',
  NUMBER = 'number',
  CONFIRM = 'confirm',
}
