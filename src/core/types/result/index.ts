/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */

import { CONTROLLER_TYPE, CONTROLLER_STATUS, CONTROLLER_ERROR } from '@/core/enum';
import { Interact } from '@/core/types/data';
// import { HTTPResult, HTTPExtraResult, HTTPDetailResult } from '@/core/types/result/protocol/http';

// import { ComponentResult, ComponentExtraResult, ComponentDetailResult } from '@/core/types/result/combination/component';
// import { ConditionResult, ConditionExtraResult, ConditionDetailResult } from '@/core/types/result/combination/condition';

// import { LoopResult, LoopExtraResult, LoopDetailResult } from '@/core/types/result/combination/loop';
// import { PollResult, PollExtraResult, PollDetailResult } from '@/core/types/result/combination/poll';
// import { DataSetResult, DataSetExtraResult, DataSetDetailResult } from '@/core/types/result/combination/data-set';

// import { MySQLResult, MySQLExtraResult, MySQLDetailResult } from '@/core/types/result/middleware/mysql';
// import { RedisResult, RedisExtraResult, RedisDetailResult } from '@/core/types/result/middleware/redis';
// import { MongoDBResult, MongoDBExtraResult, MongoDBDetailResult } from '@/core/types/result/middleware/mongodb';
// import { OracleDBResult, OracleDBExtraResult, OracleDBDetailResult } from '@/core/types/result/middleware/oracledb';
// import { MSSQLResult, MSSQLExtraResult, MSSQLDetailResult } from '@/core/types/result/middleware/mssql';
// import { PostgreSQLResult, PostgreSQLExtraResult, PostgreSQLDetailResult } from '@/core/types/result/middleware/postgresql';

// import { ScriptResult, ScriptExtraResult, ScriptDetailResult } from '@/core/types/result/script';
// import { SleepResult, SleepExtraResult, SleepDetailResult } from '@/core/types/result/sleep';

export interface ErrorResult {
  error: CONTROLLER_ERROR;
  message: string;
  stack?: string;
  extra?: unknown;
}

export interface BaseResult<T = ExtraResult> {
  /** 步骤标识 原封不动回传 */
  id?: string;
  /**
   * 引擎生成的步骤ID 可以换取 detail 记录
   * 如果没有此ID 说明没有执行到此处
   */
  stepId?: number;
  type: CONTROLLER_TYPE;
  status: CONTROLLER_STATUS;
  error: ErrorResult[];
  totalTime: number;
  /** flag */
  flag?: number;
  /** 名称，元件等有名字的，没名字可以不写，给前端展示用的 */
  name?: string;
  /** 现在的备注 */
  remark?: string;
  extra?: T;
}

export interface BaseDetailResult {
  interact?: Interact[];
}

export interface CombinationResult<T = any> extends BaseResult<T> {
  steps: Result[] | Result[][];
}

export type Result = BaseResult | CombinationResult;

// 解耦后允许完全自定义
export type DetailResult = & BaseDetailResult;
export type ExtraResult = any;

// export type ExtraResult =
//   HTTPExtraResult | DubboExtraResult | T2ExtraResult |
//   RedisExtraResult | MySQLExtraResult | MongoDBExtraResult | OracleDBExtraResult | MSSQLExtraResult | PostgreSQLExtraResult |
//   DataSetExtraResult | ComponentExtraResult | LoopExtraResult | PollExtraResult | ConditionExtraResult |
//   ScriptExtraResult | SleepExtraResult;

// export type DetailResult =
//   HTTPDetailResult | DubboDetailResult | T2DetailResult |
//   MySQLDetailResult | RedisDetailResult | MongoDBDetailResult | OracleDBDetailResult | MSSQLDetailResult | PostgreSQLDetailResult |
//   DataSetDetailResult | ComponentDetailResult | LoopDetailResult | PollDetailResult | ConditionDetailResult |
//   ScriptDetailResult | SleepDetailResult;

// export interface MergeResult<T = ExtraResult> extends BaseResult {
//   extra: T;
// }

// export type Result =
//   HTTPResult | DubboResult | T2Result |
//   MySQLResult | RedisResult | MongoDBResult | OracleDBResult | MSSQLResult | PostgreSQLResult |
//   ComponentResult | LoopResult | PollResult | ConditionResult | DataSetResult |
//   ScriptResult | SleepResult;
