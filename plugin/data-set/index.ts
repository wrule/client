/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import DataSetController from '@plugin/data-set/controller';
import { CONTROLLER_TYPE } from '@engine/core/enum';
import { registerController, registerCall } from '@engine/core';
import { testDataSet } from '@plugin/data-set/call';
import { downloadDataSetCSVFile } from '@plugin/data-set/utils';

registerController(CONTROLLER_TYPE.DATASET, {
  controller: DataSetController,
  beforeExecute: downloadDataSetCSVFile,
});

registerCall('test-dataset', testDataSet);
