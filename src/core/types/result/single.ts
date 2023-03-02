/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { ProcessScriptResult } from '@/core/script';
import { ASSIGNMENT, AssignmentOptions } from '@/assignment';
import { ASSERT } from '@/assert';
import { BaseDetailResult } from '@/core/types/result';
import { ContentType } from '@/utils/serialize/type';

export interface AssignmentResult {
  var: string;
  method: ASSIGNMENT;
  params: AssignmentOptions;
  result?: ContentType;
  error?: string;
}

export interface AssertResult {
  // 断言名称
  name?: string;
  // 断言
  fn?: ASSERT;
  // 原始值
  sourceOrigin?: string;
  // 原始值（解析后的）
  source?: string;
  // 目标值
  targetOrigin?: string;
  // 目标值（解析后的）
  target?: string;
  result: boolean;
  error?: string;
}

export interface SingleControllerDetailResult extends BaseDetailResult {
  preScript?: ProcessScriptResult[];
  postScript?: ProcessScriptResult[];
  assignment?: AssignmentResult[];
  assert?: AssertResult[];
}
