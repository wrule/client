/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */

import MySQLController from '@plugin/mysql/controller';
import { execute } from '@plugin/mysql/utils';
import { getPool } from '@plugin/mysql/pool';
import { CONTROLLER_TYPE, DATA_SOURCE_TYPE } from '@engine/core/enum';
import { registerController, registerDataSource } from '@engine/core';

registerController(CONTROLLER_TYPE.MYSQL, {
  controller: MySQLController,
});

registerDataSource(DATA_SOURCE_TYPE.MYSQL, {
  dataSourceExecute: execute,
  dataSourcePool: getPool,
});
