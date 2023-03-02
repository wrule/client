/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { SingleControllerData } from '@engine/core/types/data';
import { ProcessScriptInclude } from '@engine/core/script';
import { CONTROLLER_TYPE } from '@engine/core/enum';

export interface ScriptControllerData extends SingleControllerData {
  readonly type: CONTROLLER_TYPE.SCRIPT;
  readonly include?: ProcessScriptInclude[];
  readonly script: string;
  readonly config?: {
    /** 超时间就默认5s 5000 */
    readonly timeout?: number;
  };
}
