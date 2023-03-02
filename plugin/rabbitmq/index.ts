/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */

import RabbitMQController from '@plugin/rabbitmq/controller';
import { CONTROLLER_TYPE, DATA_SOURCE_TYPE } from '@engine/core/enum';
import { registerController, registerDataSource } from '@engine/core';
import { getPool } from '@plugin/rabbitmq/pool';

registerController(CONTROLLER_TYPE.RABBITMQ, {
  controller: RabbitMQController,
});

registerDataSource(DATA_SOURCE_TYPE.RABBITMQ, {
  dataSourcePool: getPool,
});
