/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import ScriptController from '@plugin/script/controller';
import { CONTROLLER_TYPE } from '@engine/core/enum';
import { registerController } from '@engine/core';

registerController(CONTROLLER_TYPE.SCRIPT, {
  controller: ScriptController,
});
