/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import ComponentController from '@plugin/component/controller';
import { CONTROLLER_TYPE } from '@engine/core/enum';
import { registerController } from '@engine/core';

registerController(CONTROLLER_TYPE.COMPONENT, {
  controller: ComponentController,
});
