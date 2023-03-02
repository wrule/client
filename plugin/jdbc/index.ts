/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */

import JDBCController from '@plugin/jdbc/controller';
import { CONTROLLER_TYPE, DATA_SOURCE_TYPE } from '@engine/core/enum';
import { registerController, registerDataSource } from '@engine/core';
import { execute, testDataSource, downloadJDBCFile } from '@plugin/jdbc/utils';

registerController(CONTROLLER_TYPE.JDBC, {
  controller: JDBCController,
  beforeExecute: downloadJDBCFile,
});

registerDataSource(DATA_SOURCE_TYPE.JDBC, {
  // @ts-ignore
  dataSourceExecute: execute,
  // @ts-ignore
  dataSourcePool: testDataSource,
});
