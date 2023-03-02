/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { ASSERT } from '@/assert';

export interface Assert {
  /** 断言名称 可以没有 引擎会自动生成 */
  readonly name?: string;
  readonly fn: ASSERT | (() => boolean);
  readonly source: string;
  readonly target?: string;
}
