/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { Client, Metadata, MethodDefinition, MetadataValue } from '@grpc/grpc-js';
import MetadataManager from '@plugin/grpc/metadata';
import { GRPCControllerData } from '@plugin/grpc/types/data';
import { GRPCResult, GRPCExtraResult, GRPCDetailResult } from '@plugin/grpc/types/result';
import { getGRPCPool } from '@plugin/grpc/pool';
import SingleController from '@engine/core/single';
import { BaseResult } from '@engine/core/types/result';
import { PreContext, PostContext } from '@engine/core/types/vm';
import { CONTROLLER_TYPE } from '@engine/core/enum';
import { Context, ControllerExtraConfig } from '@engine/core/execute';
import { getServerById, timerExecute, changeContentFromVariables } from '@engine/core/utils';
import { SystemError, ExecuteError, ResponseError } from '@engine/core/error';
import { GRPCServer, SERVER_TYPE } from '@engine/dispatch/types/server';
import { getSocketInfo, SocketInfo } from '@engine/utils/socket';
import { CONFIG } from '@engine/config';
import { createTracing } from '@engine/utils/trace';

interface Result {
  request: {
    /** 一组KV数据 类似HTTP的头信息 */
    metadata: Record<string, MetadataValue[]>;
    /** 发送数据 */
    message: any;
  };
  response?: {
    /** 结果数据 */
    message?: any;
    metadata?: Record<string, MetadataValue[]>;
  };
  code?: number;
  network?: SocketInfo;
  trace?: string;
}

interface RequestData {
  message: any;
  metadata: Metadata;
}
interface ResponseData extends RequestData {
  code: number;
  network?: SocketInfo;
}

/**
 * gRPC 步骤
 * @author William Chan <root@williamchan.me>
 */
export default class GRPCController extends SingleController<GRPCControllerData> {
  private readonly services!: GRPCServer;
  private result = {} as Result;
  private readonly params!: {
    message: string | any;
    metadata: MetadataManager;
  };

  /**
   * @inheritdoc
   */
  public constructor(data: GRPCControllerData, context: Context, extra?: ControllerExtraConfig) {
    super(data, context, extra);
    // get env data source config
    const server = getServerById<GRPCServer>(this.data.serverId, SERVER_TYPE.GRPC, this.context.env.server);
    if (server) {
      this.services = server;
    } else {
      this.setError(new SystemError(`GRPC Configuration ${this.data.serverId} not found.`));
    }
    const metadata = new MetadataManager(CONFIG.GRPC_DEFAULT_METADATA, this.variable);
    this.params = {
      message: this.data.message,
      metadata,
    };
    if (this.data.metadata) {
      metadata.assign(this.data.metadata);
    }
  }

  /**
   * getMessage
   * @returns {Record<string, unknown> | unknown[]}
   */
  private getMessage(): Record<string, unknown> | unknown[] {
    if (typeof this.params.message === 'string') {
      const body = this.variable.replace(this.params.message);
      return JSON.parse(body);
    }
    return changeContentFromVariables(this.params.message, this.variable);
  }

  /**
   * create pre script context & method
   */
  protected createPreVMContext(): PreContext {
    const vmContext = Object.create(null) as PreContext;
    vmContext.pre = Object.create(null);
    vmContext.pre.setMessage = (message: any) => {
      this.params.message = message;
    };
    vmContext.pre.getMessage = () => this.getMessage();
    vmContext.pre.getMetadata = (): MetadataManager => {
      if (!this.params.metadata) {
        this.params.metadata = new MetadataManager(this.variable);
      }
      return this.params.metadata;
    };
    return vmContext;
  }

  /**
   * create post script context & method
   * @returns
   */
  protected createPostVMContext(): PostContext {
    const vmContext = Object.create(null) as PostContext;
    vmContext.post = Object.create(null);
    vmContext.post.getResultMessage = () => this.result.response?.message;
    vmContext.post.getResultCode = () => this.result.code;
    vmContext.post.getResultMetadata = () => this.result.response?.metadata;

    return vmContext;
  }

  /**
   * 构造请求数据
   * @returns
   */
  private getRequestData(): RequestData {
    const message = this.getMessage();
    // append metadata
    const metadata = new Metadata();
    this.params.metadata.forEach((value, key) => {
      metadata.add(key, value);
    });
    return { message, metadata };
  }

  private static getRequestMethodName(method: MethodDefinition<any, any>): string {
    if (method.requestStream) {
      if (method.responseStream) {
        return 'makeBidiStreamRequest';
      }
      return 'makeClientStreamRequest';
    }
    if (method.responseStream) {
      return 'makeServerStreamRequest';
    }
    return 'makeUnaryRequest';
  }

  private async request(client: Client, method: MethodDefinition<any, any>, request: RequestData): Promise<ResponseData> {
    const methodName = GRPCController.getRequestMethodName(method);
    if (methodName !== 'makeUnaryRequest') {
      throw new Error(`GRPC request method ${method.originalName} is ${methodName} not support`);
    }

    return new Promise((resolve, reject) => {
      const response = {} as ResponseData;
      const event = client.makeUnaryRequest(
        method.path,
        method.requestSerialize,
        method.responseDeserialize,
        request.message,
        request.metadata,
        (err: Error | null, message: any) => {
          if (err) {
            reject(err);
          } else {
            response.message = message;
            resolve(response);
          }
        },
      );
      event.on('status', (status: any) => {
        response.code = status.code;
        // @ts-ignore
        response.network = getSocketInfo(event?.call?.call?.subchannel?.session?.socket);
      });
      event.on('metadata', (meta: Metadata) => {
        response.metadata = meta;
      });
    });
  }

  /**
   * @inheritdoc
   */
  protected async execute(): Promise<boolean> {
    try {
      const instance = await getGRPCPool(this.services, this.data);
      const client = instance.instance;
      // @ts-ignore
      const fn = client[this.data.method] as MethodDefinition<any, any>;
      if (!fn) throw new Error(`The server does not implement the method ${this.data.method}`);
      const request = this.getRequestData();

      if (this.context.traceState) {
        this.result.trace = createTracing();
        request.metadata.set('traceparent', this.result.trace);
        request.metadata.set('tracestate', this.context.traceState);
      }

      this.result.request = {
        message: request.message,
        metadata: request.metadata.toJSON(),
      };

      const timeout = this.data.config?.timeout || CONFIG.GRPC_DEFAULT_TIMEOUT;
      this.beginTimer();
      const response = await timerExecute<ResponseData>(
        this.request(client, fn, request),
        timeout,
        `Execute timed out after ${timeout}ms`,
      );
      this.totalTime = this.endTimer();

      this.result.response = {
        message: response.message,
        metadata: response.metadata?.toJSON(),
      };
      this.result.network = response.network;
      this.result.code = response.code;

      this.variable.setLocal('RESULT_MESSAGE', this.result.response.message);
      this.variable.setLocal('RESULT_METADATA', this.result.response.metadata);
    } catch (e) {
      this.totalTime = this.endTimer();
      if (e instanceof ResponseError) {
        throw e;
      } else {
        throw new ExecuteError(e);
      }
    }

    return true;
  }

  //  -------------------------------- 结果相关 --------------------------------

  /**
   * @inheritdoc
   */
  public async getExtraResult(): Promise<GRPCExtraResult> {
    return {
      host: this.services?.host,
      port: this.services?.port,
      tls: this.services?.tls,
      serverName: this.services?.serverName,
      code: this.result.code,
      network: this.result.network,
      proto: this.data.proto,
      package: this.data.package,
      serverId: this.data.serverId,
      service: this.data.service,
      method: this.data.method,
      config: this.data.config,
      trace: this.result.trace,
    };
  }

  /**
   * @inheritdoc
   */
  public async getDetailResult(): Promise<GRPCDetailResult> {
    const base = await super.getDetailResult();
    return {
      ...base,
      request: this.result.request,
      response: this.result.response,
    };
  }

  /**
   * Create Init Result
   * @param base
   * @param data
   * @returns {GRPCResult}
   */
  public static createInitResult(base: BaseResult, data: GRPCControllerData): GRPCResult {
    const result: GRPCResult = {
      ...base,
      type: CONTROLLER_TYPE.GRPC,
      extra: {
        proto: data.proto,
        package: data.package,
        serverId: data.serverId,
        service: data.service,
        method: data.method,
        config: data.config,
      },
    };
    return result;
  }
}
