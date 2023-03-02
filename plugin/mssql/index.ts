/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */

import MSSQLController from '@plugin/mssql/controller';
import { CONTROLLER_TYPE, DATA_SOURCE_TYPE } from '@engine/core/enum';
import { registerController, registerDataSource } from '@engine/core';
import { execute } from '@plugin/mssql/utils';
import { getPool } from '@plugin/mssql/pool';

registerController(CONTROLLER_TYPE.MSSQL, {
  controller: MSSQLController,
});

registerDataSource(DATA_SOURCE_TYPE.MSSQL, {
  dataSourceExecute: execute,
  dataSourcePool: getPool,
});
