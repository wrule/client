/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { ProcessScriptResultError } from '@engine/core/script';
import { BaseResult } from '@engine/core/types/result';
import { SingleControllerDetailResult } from '@engine/core/types/result/single';
import { CONTROLLER_TYPE } from '@engine/core/enum';
import { ConsoleData } from '@engine/vm/console';

export interface ScriptExtraResult {
}

export interface ScriptDetailResult extends SingleControllerDetailResult {
  script: string;
  logs?: ConsoleData[];
  error?: ProcessScriptResultError;
}

export interface ScriptResult extends BaseResult<ScriptExtraResult> {
  type: CONTROLLER_TYPE.SCRIPT;
}
