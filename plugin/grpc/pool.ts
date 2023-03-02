/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */

import get from 'lodash/get';
import { credentials, ServiceClientConstructor, loadPackageDefinition, Client, ChannelCredentials } from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import BasePool, { InstanceResult } from '@engine/core/pool';
import { GRPCServer } from '@engine/dispatch/types/server';
// import { opts, CONFIG } from '@engine/config';
import { FileData, getFullPath, readFile } from '@engine/utils/file';
import { GRPCControllerData } from '@plugin/grpc/types/data';

/**
 * gRPC 资源池
 */
class GRPCPool extends BasePool<Client> {
  /**
   * 根据 server 获取资源
   * @param server
   * @returns {Promise<InstanceResult<T2SDK.Instance>>}
   */
  public async getPool(server: GRPCServer, data: GRPCControllerData): Promise<InstanceResult<Client>> {
    const file = server.proto.find((p) => p['@fileKey'] === data.proto);
    if (!file) throw new Error(`${data.proto} not found`);
    // 服务器 + 端口 + 协议 + 文件名 + 文件版本 + 服务
    const key = `${server.host}:${server.port}:${server.tls}:${file['@fileKey']}#${file.version}:${data.service}`;
    const client = await this.get(key, server, file, data);
    return client;
  }

  /**
   * @inheritdoc
   */
  protected async create(server: GRPCServer, file: FileData, data: GRPCControllerData): Promise<InstanceResult<Client>> {
    const packageDefinition = await protoLoader.load(getFullPath(file), {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
    });
    const protoDescriptor = loadPackageDefinition(packageDefinition);
    const path = data.package ? `${data.package}.${data.service}` : data.service;
    const ServiceClient = get(protoDescriptor, path) as ServiceClientConstructor;
    if (!ServiceClient) {
      throw new Error(`gRPC service ${path} not found`);
    }
    let channelCredentials!: ChannelCredentials;
    if (server.tls) {
      const task: (Promise<Buffer> | null)[] = [];
      // rootCA
      task.push(server.tlsOptions?.ca ? readFile(server.tlsOptions.ca) : null);
      // privateKey
      task.push(server.tlsOptions?.key ? readFile(server.tlsOptions.key) : null);
      // certificate
      task.push(server.tlsOptions?.cert ? readFile(server.tlsOptions.cert) : null);
      const result = await Promise.all(task);
      channelCredentials = credentials.createSsl(result[0], result[1], result[2]);
    } else {
      channelCredentials = credentials.createInsecure();
    }
    const client = new ServiceClient(`${server.host}:${server.port}`, channelCredentials);
    return { instance: client };
  }

  /**
   * @inheritdoc
   */
  protected free(instance: InstanceResult<Client>): void {
    instance.instance.close();
  }
}

const pool = new GRPCPool();

export const getGRPCPool = pool.getPool.bind(pool);
