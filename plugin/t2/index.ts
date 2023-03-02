/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import T2Controller from '@plugin/t2/controller';
import { CONTROLLER_TYPE } from '@engine/core/enum';
import { registerController } from '@engine/core';
import { downloadT2File } from '@plugin/t2/utils';

registerController(CONTROLLER_TYPE.T2, {
  controller: T2Controller,
  beforeExecute: downloadT2File,
});
