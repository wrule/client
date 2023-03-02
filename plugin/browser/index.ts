/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import BrowserController from '@plugin/browser/controller';
import { CONTROLLER_TYPE } from '@engine/core/enum';
import { registerController } from '@engine/core';

registerController(CONTROLLER_TYPE.BROWSER, {
  controller: BrowserController,
});
