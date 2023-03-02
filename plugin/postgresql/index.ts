/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */

import PostgreSQLController from '@plugin/postgresql/controller';
import { CONTROLLER_TYPE, DATA_SOURCE_TYPE } from '@engine/core/enum';
import { registerController, registerDataSource } from '@engine/core';
import { execute } from '@plugin/postgresql/utils';
import { getPool } from '@plugin/postgresql/pool';

registerController(CONTROLLER_TYPE.POSTGRESQL, {
  controller: PostgreSQLController,
});

registerDataSource(DATA_SOURCE_TYPE.POSTGRESQL, {
  dataSourcePool: getPool,
  dataSourceExecute: execute,
});
