/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import DataSetController from '@plugin/data-set-case/controller';
import { CONTROLLER_TYPE } from '@engine/core/enum';
import { registerController, registerCall } from '@engine/core';
import { testDataSet } from '@plugin/data-set-case/call';
import { downloadDataSetCSVFile } from '@plugin/data-set-case/utils';

registerController(CONTROLLER_TYPE.DATASET_CASE, {
  controller: DataSetController,
  beforeExecute: downloadDataSetCSVFile,
});

registerCall('test-dataset-case', testDataSet);
