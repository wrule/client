/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { T2ControllerData } from '@plugin/t2/types/data';
import { downloadFile } from '@engine/utils/file';
import { T2Server, SERVER_TYPE } from '@engine/dispatch/types/server';
import { Context } from '@engine/core/execute';
import { getServerById } from '@engine/core/utils';

/**
 * Download T2 File
 * @param data
 */
export const downloadT2File = async (data: T2ControllerData, context: Context): Promise<void> => {
  const server = getServerById<T2Server>(data.serverId, SERVER_TYPE.T2, context.env.server);
  if (server) {
    if (server.config.license) {
      await downloadFile(server.config.license.cert);
    }
    if (server.config?.tls) {
      const cfg = server.config.tls;
      if (cfg.cert.ext) {
        cfg.cert.ext = 'pfx';
      }
      await downloadFile(cfg.cert);
    }
  }
};
