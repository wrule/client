/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */

import MongoDBController from '@plugin/mongodb/controller';
import { getPool } from '@plugin/mongodb/pool';
import { CONTROLLER_TYPE, DATA_SOURCE_TYPE } from '@engine/core/enum';
import { registerController, registerDataSource } from '@engine/core';

registerController(CONTROLLER_TYPE.MONGODB, {
  controller: MongoDBController,
});

registerDataSource(DATA_SOURCE_TYPE.MONGODB, {
  dataSourcePool: getPool,
});
