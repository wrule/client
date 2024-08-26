/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
// import { MySQLControllerData } from '@plugin/mysql/types/data';
// import { RedisControllerData } from '@plugin/redis/types/data';
// import { MongoDBControllerData } from '@plugin/mongodb/types/data';
// import { OracleDBControllerData } from '@plugin/oracledb/types/data';
// import { MSSQLControllerData } from '@plugin/mssql/types/data';
// import { PostgreSQLControllerData } from '@plugin/postgresql/types/data';
// import { ComponentControllerData } from '@plugin/component/types/data';
// import { ConditionControllerData } from '@plugin/condition/types/data';
// import { LoopControllerData } from '@plugin/loop/types/data';
// import { PollControllerData } from '@plugin/poll/types/data';
// import { DataSetControllerData } from '@plugin/data-set/types/data';
// import { ScriptControllerData } from '@plugin/script/types/data';
// import { SleepControllerData } from '@plugin/sleep/types/data';
// import { T2ControllerData } from '@plugin/t2/types/data';

import { Assignment } from '@/core/types/data/assignment';
import { Assert } from '@/core/types/data/assert';
import { ProcessScript } from '@/core/script';
import { CONTROLLER_TYPE, INTERACT_TYPE } from '@/core/enum';
import { ContentType } from '@/utils/serialize/type';

export interface Interact {
  /** 提示语，界面上的一句话，必须 */
  content: string;
  /** 交互式步骤类型 先简单三种 字符串 数字 confirm */
  type: INTERACT_TYPE;
  /** 交互式结果是否保存为某个变量 不填的话 针对 string number 类几乎等于无效了 */
  var?: string;
  /** 用户填写的值 */
  input?: string;
  /** 解析后的实际值 */
  value?: ContentType;
}

export interface BaseControllerData {
  /** 步骤标识 原封不动会回传 */
  readonly id?: string;
  readonly type: CONTROLLER_TYPE;
  /** flag 详见 CONTROLLER_FLAG */
  readonly flag?: number;
  /** 名称，元件等有名字的，没名字可以不写，给前端展示用的 */
  readonly name?: string;
  /** 现在的备注 */
  readonly remark?: string;
  /** 步骤中的交互 */
  readonly interact?: Interact[];
}

export interface SingleControllerData extends BaseControllerData {
  // 预处理
  readonly preScript?: ProcessScript[];
  readonly postScript?: ProcessScript[];
  // 提取
  readonly assignment?: Assignment[];
  // 断言
  readonly assert?: Assert[];
}

export interface CombinationControllerData extends BaseControllerData {
  steps: ControllerData[] | ControllerData[][];
}

export type ControllerData = SingleControllerData | CombinationControllerData;

// export type SingleControllerDataGroup =
//    DubboControllerData |
//    MySQLControllerData | RedisControllerData | MongoDBControllerData | OracleDBControllerData | MSSQLControllerData |
//    PostgreSQLControllerData |
//    ScriptControllerData | SleepControllerData |
//    T2ControllerData;

// export type CombinationControllerDataGroup =
//   ComponentControllerData | ConditionControllerData | LoopControllerData | PollControllerData | DataSetControllerData;

// export type ControllerData = SingleControllerDataGroup | CombinationControllerDataGroup;
