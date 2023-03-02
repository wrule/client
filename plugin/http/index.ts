/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import HTTPController from '@plugin/http/controller';
import { CONTROLLER_TYPE } from '@engine/core/enum';
import { registerController } from '@engine/core';
import { downloadHTTPUploadFile } from '@plugin/http/utils';

registerController(CONTROLLER_TYPE.HTTP, {
  controller: HTTPController,
  beforeExecute: downloadHTTPUploadFile,
});
