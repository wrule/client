/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { Channel } from 'node-dubbo/lib/consumer';
import java from 'js-to-java';
import { encode, encodeGeneric, HessianJavaEncoderData, JSONSchemaToDubboParams } from '@plugin/dubbo/utils';
import { getDubboPool } from '@plugin/dubbo/pool';
import { DubboControllerData, DubboParams } from '@plugin/dubbo/types/data';
import { DubboResult, DubboExtraResult, DubboDetailResult, DubboResultError } from '@plugin/dubbo/types/result';
import { ZooKeeperDataSource } from '@plugin/dubbo/types/zookeeper';
import SingleController from '@engine/core/single';
import { PreContext, PostContext } from '@engine/core/types/vm';
import { BaseResult } from '@engine/core/types/result';
import { CONTROLLER_TYPE, DATA_SOURCE_TYPE } from '@engine/core/enum';
import { Context, ControllerExtraConfig } from '@engine/core/execute';
import { getDataSourceByServer, timerExecute, changeContentFromVariables } from '@engine/core/utils';
import { SystemError, ExecuteError, ResponseError } from '@engine/core/error';
import { getSocketInfo, SocketInfo } from '@engine/utils/socket';
import { CONFIG } from '@engine/config';
import { createTracing } from '@engine/utils/trace';

interface ResultOptions {
  network?: SocketInfo;
  params?: DubboParams[] | HessianJavaEncoderData[] | unknown;
  result?: any;
  error?: DubboResultError;
  trace?: string;
}

/**
 * Dubbo 步骤
 * @author William Chan <root@williamchan.me>
 */
export default class DubboController extends SingleController<DubboControllerData> {
  private readonly services!: ZooKeeperDataSource;
  private readonly result: ResultOptions = {};
  private params?: DubboParams[];
  private body?: unknown;

  /**
   * @inheritdoc
   */
  public constructor(data: DubboControllerData, context: Context, extra?: ControllerExtraConfig) {
    super(data, context, extra);

    // get env data source config
    const server = getDataSourceByServer<ZooKeeperDataSource>(this.data.serverId, this.context.env.dataSource);
    if (server && server.type === DATA_SOURCE_TYPE.ZOOKEEPER) {
      this.services = server;
    } else {
      this.setError(new SystemError(`ZooKeeper Configuration ${this.data.serverId} not found.`));
    }
    if (this.data.jsonSchema) {
      this.body = this.data.body;
    } else {
      this.params = this.data.params;
    }
  }

  /**
   * create pre script context & method
   */
  protected createPreVMContext(): PreContext {
    const vmContext = Object.create(null) as PreContext;
    vmContext.java = java;
    vmContext.pre = Object.create(null);
    vmContext.pre.setParams = (params: any) => {
      this.params = params;
    };
    vmContext.pre.setData = (body: any) => {
      this.body = body;
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
    vmContext.post.getResultData = () => this.result.result;
    return vmContext;
  }

  /**
   * 获取发送前的数据
   * @param {any[]} params 经过处理的用户数据
   * @returns Hessian Data
   */
  private getHessianData(params: any[]): any[] {
    // isGeneric
    if (this.data.config?.isGeneric) {
      for (let index = 0; index < params.length; index++) {
        const item = params[index];
        if (!item.$class) throw new Error(`Generic encode failed, please input dubbo $class params index = ${index}`);
      }
      const data = [
        { $class: 'java.lang.String', $: this.data.method },
        { $class: '[java.lang.String', $: params.map((item) => item.$class.replace(/<.*>/, '')) },
        { $class: '[java.lang.Object', $: params.map((item) => encodeGeneric(item.$data)) },
      ];
      return data;
    }
    if (this.data.jsonSchema) {
      return encode(JSONSchemaToDubboParams(params, this.data.jsonSchema).$data as DubboParams[]);
    }
    return encode(params as DubboParams[]);
  }

  /**
   * 获取 host
   */
  private get host(): string {
    const host = `${this.services.host}:${this.services.port || CONFIG.ZOOKEEPER_DEFAULT_PORT}`;
    return host;
  }

  /**
   * @inheritdoc
   */
  protected async execute(): Promise<boolean> {
    let client!: Channel;
    try {
      const app = await getDubboPool(this.services);
      // invoke
      client = await app.instance.invoke(app, this.data.interface, {
        group: this.data.group,
        version: this.data.version,
      }) as Channel;
      // 参数替换
      const params = this.data.jsonSchema
        ? changeContentFromVariables(this.body, this.variable)
        : changeContentFromVariables(this.params, this.variable);

      if (!params) {
        throw new ExecuteError('Dubbo params is empty');
      }
      this.result.params = params;

      const attachment: Record<string, any> = {};

      if (this.context.traceState) {
        this.result.trace = createTracing();
        attachment.traceparent = this.result.trace;
        attachment.tracestate = this.context.traceState;
      }
      if (this.data.config?.isGeneric) attachment.generic = true;
      const timeout = this.data.config?.timeout || CONFIG.DUBBO_DEFAULT_TIMEOUT;
      const method = this.data.config?.isGeneric ? '$invoke' : this.data.method;
      // eslint-disable-next-line no-nested-ternary
      const data = this.getHessianData(params);

      const exec = client.execute(this.data.interface, method, data, {
        group: this.data.group,
        version: this.data.version,
        attachment,
        timeout,
        isDubbox: this.data.config?.isDubbox,
      });
      // console.log(this.result.params);
      this.beginTimer();
      const result = await timerExecute(exec, timeout, `Execute timed out after ${timeout}ms, host = ${client.id}`);
      this.totalTime = this.endTimer();

      this.result.result = result;
      // console.log(result);
      this.variable.setLocal('RESULT_DATA', result);
      this.result.network = getSocketInfo(client.tcp);
    } catch (e) {
      this.totalTime = this.endTimer();
      if (client !== undefined) this.result.network = getSocketInfo(client.tcp);
      // JavaExceptionError 且没有断言
      // 这是 hessian.js 抛出的异常
      if (e.cause) {
        const message = `${e.name}: ${e.message.trim()}` || '';
        const error = {
          message,
          stack: e.cause.stackTrace,
        };
        this.result.error = error;
        if (!this.data.assert?.length) {
          throw new ResponseError(message || 'unknown error');
        } else {
          this.variable.setLocal('RESULT_DATA', error);
        }
      } else {
        const msg: string[] = e.message.trim().split('\n');
        if (msg.length > 1) {
          throw new ExecuteError(msg.shift() || '', msg.join('\n'));
        } else {
          throw new ExecuteError(e);
        }
      }
    }

    return true;
  }

  //  -------------------------------- 结果相关 --------------------------------

  /**
   * @inheritdoc
   */
  public async getExtraResult(): Promise<DubboExtraResult> {
    const services = this.services || {};
    return {
      registry: {
        host: services.host,
        port: services.port,
        config: services.config,
      },
      interface: this.data.interface,
      method: this.data.method,
      version: this.data.version,
      group: this.data.group,
      config: this.data.config,
      network: this.result.network,
      serverId: this.data.serverId,
      serverName: services.serverName,
      trace: this.result.trace,
    };
  }

  /**
   * @inheritdoc
   */
  public async getDetailResult(): Promise<DubboDetailResult> {
    const base = await super.getDetailResult();
    return {
      ...base,
      params: this.result.params || this.data.params || this.data.body,
      result: this.result.result,
      error: this.result.error,
    };
  }

  /**
   * Create Init Result
   * @param base
   * @param data
   * @returns {MySQLResult}
   */
  public static createInitResult(base: BaseResult, data: DubboControllerData): DubboResult {
    const result: DubboResult = {
      ...base,
      type: CONTROLLER_TYPE.DUBBO,
      extra: {
        interface: data.interface,
        method: data.method,
        version: data.version,
        group: data.group,
        serverId: data.serverId,
        config: data.config,
      },
    };
    return result;
  }
}
