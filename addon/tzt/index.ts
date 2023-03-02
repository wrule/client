/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import TZTController from '@addon/tzt/controller';
import { CONTROLLER_TYPE } from '@engine/core/enum';
import { registerController } from '@engine/core';

registerController(CONTROLLER_TYPE.TZT, {
  controller: TZTController,
});
