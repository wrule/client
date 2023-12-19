import { CONFIG } from '@/config';
import { ExecuteError, ResponseError, SystemError } from '@/core/error';
import { Context, ControllerExtraConfig } from '@/core/execute';
import SingleController from '@/core/single';
import { PostContext, PreContext } from '@/core/types/vm';
import { changeContentFromVariables, getServerById } from '@/core/utils';
import { SERVER_TYPE, T3Server } from '@/dispatch/types/server';
import { T3Body, T3ControllerData } from '@plugin/t3/types/data';
import { BaseResult } from '@/core/types/result';
import { CONTROLLER_TYPE } from '@/core/enum';
import { execute } from './utils';
import { T3DetailResult, T3ExtraResult, T3Result } from './types/result';

export default class T3Controller extends SingleController<T3ControllerData> {
  private readonly services!: T3Server;
  // 因为不使用node-t2sdk的连接池，所以结构中没有errcode和errmsg
  private result?: { data?: any };
  private readonly params!: {
    body?: T3Body;
  };

  /**
   * @inheritdoc
   */
  public constructor(data: T3ControllerData, context: Context, extra?: ControllerExtraConfig) {
    super(data, context, extra);

    // get env data source config
    const server = getServerById<T3Server>(this.data.serverId, SERVER_TYPE.T3, this.context.env.server);
    if (server) {
      this.services = server;
    } else {
      this.setError(new SystemError(`T3 Configuration ${this.data.serverId} not found.`));
    }
    this.params = {
      body: this.data.body,
    };
  }

  /**
   * getBody
   * @returns {Record<string, unknown> | unknown[]}
   */
  private getBody(): Record<string, unknown> | unknown[] {
    if (typeof this.params.body === 'string') {
      const body = this.variable.replace(this.params.body);
      let rt = {};
      try {
        rt = JSON.parse(body);
      } catch (e) {
        throw new ExecuteError(`T3 body is not a valid json string: ${body}`);
      }
      return rt;
    }
    return changeContentFromVariables(this.params.body, this.variable);
  }

  /**
   * create pre script context & method
   */
  protected createPreVMContext(): PreContext {
    const vmContext = Object.create(null) as PreContext;
    vmContext.pre = Object.create(null);
    vmContext.pre.setBody = (body: any) => {
      this.params.body = body;
    };
    vmContext.pre.getBody = () => this.getBody();
    return vmContext;
  }

  /**
   * create post script context & method
   * @returns
   */
  protected createPostVMContext(): PostContext {
    const vmContext = Object.create(null) as PostContext;
    vmContext.post = Object.create(null);
    vmContext.post.getResultData = () => this.result?.data?.data?.responseMsg;
    // vmContext.post.getResultCode = () => this.result?.errcode;

    return vmContext;
  }

  /**
   * @inheritdoc
   */
  protected async execute(): Promise<boolean> {
    try {
      const timeout = this.data.config?.timeout || CONFIG.T3_DEFAULT_TIMEOUT;
      const body = this.getBody();
      this.params.body = body;
      let bodyStr = this.data.body;
      try {
        bodyStr = JSON.stringify(body);
      } catch (error) {

      }
      const result = await execute({
        functionId: this.data.functionNo,
        service: this.data.service,
        security: this.data.security,
        requestParams: this.data.requestParams,
        shardingInfo: this.data.shardingInfo,
        t3Server: {
          ...this.services,
        },
      }, timeout, bodyStr);
      this.totalTime = result.totalTime;
      this.result = result;
      this.variable.setLocal('RESULT_DATA', result.data?.data?.responseMsg);
      // this.variable.setLocal('RESULT_CODE', result.errcode);
    } catch (e) {
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
  public async getExtraResult(): Promise<T3ExtraResult> {
    return {
      // options: this.params?.options || this.data.options,
      functionNo: this.data.functionNo,
      service: this.data.service,
      security: this.data.security,
      requestParams: this.data.requestParams,
      shardingInfo: this.data.shardingInfo,
      serverId: this.data.serverId,
      serverName: this.services?.serverName,
      config: this.data.config,
    };
  }

  /**
   * @inheritdoc
   */
  public async getDetailResult(): Promise<T3DetailResult> {
    const base = await super.getDetailResult();
    return {
      ...base,
      body: this.params.body || this.data.body,
      result: this.result?.data?.data?.responseMsg,
      // error: this.result && this.result.errcode !== 0 ? {
      //   errcode: this.result.errcode,
      //   errmsg: this.result.errmsg,
      // } : undefined,
    };
  }

  /**
   * Create Init Result
   * @param base
   * @param data
   * @returns {MySQLResult}
   */
  public static createInitResult(base: BaseResult, data: T3ControllerData): T3Result {
    const result: T3Result = {
      ...base,
      type: CONTROLLER_TYPE.T3,
      extra: {
        functionNo: data.functionNo,
        service: data.service,
        security: data.security,
        requestParams: data.requestParams,
        shardingInfo: data.shardingInfo,
        // options: data.options,
        serverId: data.serverId,
        config: data.config,
      },
    };
    return result;
  }
}
