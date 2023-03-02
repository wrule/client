/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { GRPCControllerData } from '@plugin/grpc/types/data';
import { downloadFile } from '@engine/utils/file';
import { GRPCServer, SERVER_TYPE } from '@engine/dispatch/types/server';
import { Context } from '@engine/core/execute';
import { getServerById } from '@engine/core/utils';

/**
 * Download gRPC File
 * @param data
 */
export const downloadGRPCFile = async (data: GRPCControllerData, context: Context): Promise<void> => {
  const server = getServerById<GRPCServer>(data.serverId, SERVER_TYPE.GRPC, context.env.server);
  if (server) {
    if (server.proto) {
      const dir = `grpc-${server.serverId.replace(/[^a-zA-Z0-9_\-.]/g, '_')}`;
      const task = server.proto.map((item): Promise<string> => {
        // eslint-disable-next-line no-param-reassign
        item.group = dir;
        return downloadFile(item);
      });
      await Promise.all(task);
    }
    if (server.tlsOptions) {
      const task: Promise<string>[] = [];
      if (server.tlsOptions.ca) task.push(downloadFile(server.tlsOptions.ca));
      if (server.tlsOptions.cert) task.push(downloadFile(server.tlsOptions.cert));
      if (server.tlsOptions.key) task.push(downloadFile(server.tlsOptions.key));
      await Promise.all(task);
    }
  }
};
