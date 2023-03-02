/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import DubboController from '@plugin/dubbo/controller';
import { CONTROLLER_TYPE } from '@engine/core/enum';
import { registerController, registerCall } from '@engine/core';
import { queryZooKeeper } from '@plugin/dubbo/call';

registerController(CONTROLLER_TYPE.DUBBO, {
  controller: DubboController,
});

registerCall('query-zookeeper', queryZooKeeper);
