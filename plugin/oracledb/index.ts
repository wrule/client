/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */

import OracleDBController from '@plugin/oracledb/controller';
import { CONTROLLER_TYPE, DATA_SOURCE_TYPE } from '@engine/core/enum';
import { registerController, registerDataSource } from '@engine/core';
import { execute } from '@plugin/oracledb/utils';
import { getPool } from '@plugin/oracledb/pool';

registerController(CONTROLLER_TYPE.ORACLEDB, {
  controller: OracleDBController,
});

registerDataSource(DATA_SOURCE_TYPE.ORACLEDB, {
  dataSourcePool: getPool,
  dataSourceExecute: execute,
});
