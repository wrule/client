/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import PollController from '@plugin/poll/controller';
import { CONTROLLER_TYPE } from '@engine/core/enum';
import { registerController } from '@engine/core';

registerController(CONTROLLER_TYPE.POLL, {
  controller: PollController,
});
