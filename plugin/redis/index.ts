/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import RedisController from '@plugin/redis/controller';
import { getPool } from '@plugin/redis/pool';
import { CONTROLLER_TYPE, DATA_SOURCE_TYPE } from '@engine/core/enum';
import { registerController, registerDataSource } from '@engine/core';

registerController(CONTROLLER_TYPE.REDIS, {
  controller: RedisController,
});

registerDataSource(DATA_SOURCE_TYPE.REDIS, {
  dataSourcePool: getPool,
});
