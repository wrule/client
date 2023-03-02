/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import GRPCController from '@plugin/grpc/controller';
import { CONTROLLER_TYPE } from '@engine/core/enum';
import { registerController } from '@engine/core';
import { downloadGRPCFile } from '@plugin/grpc/utils';

registerController(CONTROLLER_TYPE.GRPC, {
  controller: GRPCController,
  beforeExecute: downloadGRPCFile,
});
