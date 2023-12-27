import T3Controller from '@plugin/t3/controller';
import { CONTROLLER_TYPE } from '@engine/core/enum';
import { registerController } from '@engine/core';
import { downloadT3File } from '@plugin/t3/utils';

registerController(CONTROLLER_TYPE.T3, {
  controller: T3Controller,
  beforeExecute: downloadT3File,
});
