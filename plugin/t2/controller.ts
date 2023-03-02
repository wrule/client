/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { Result } from 'node-t2sdk';
import { T2ControllerData, T2Body } from '@plugin/t2/types/data';
import { T2Result, T2ExtraResult, T2DetailResult } from '@plugin/t2/types/result';
import { getT2Pool } from '@plugin/t2/pool';
import SingleController from '@engine/core/single';
import { BaseResult } from '@engine/core/types/result';
import { PreContext, PostContext } from '@engine/core/types/vm';
import { CONTROLLER_TYPE } from '@engine/core/enum';
import { Context, ControllerExtraConfig } from '@engine/core/execute';
import { getServerById, timerExecute, changeContentFromVariables } from '@engine/core/utils';
import { SystemError, ExecuteError, ResponseError } from '@engine/core/error';
import { T2Server, T2Options, SERVER_TYPE } from '@engine/dispatch/types/server';
// import { getSocketInfo, SocketInfo } from '@engine/utils/socket';
import { CONFIG } from '@engine/config';

const getT2Error = (result: Result): string => {
  if (result.errmsg) {
    return result.errmsg;
  }
  if (result.data) {
    if (result.data[0] && result.data[0][0]) {
      if (result.data[0][0].error_info && result.data[0][0].error_pathinfo) {
        return `${result.data[0][0].error_info} # ${result.data[0][0].error_pathinfo}`;
      }
    }
  }
  return `unknown error#${result.errcode}`;
};

/**
 * T2 步骤
 * @author William Chan <root@williamchan.me>
 */
export default class T2Controller extends SingleController<T2ControllerData> {
  private readonly services!: T2Server;
  private result?: Result;
  private readonly params!: {
    body?: T2Body;
    options?: T2Options;
  };

  /**
   * @inheritdoc
   */
  public constructor(data: T2ControllerData, context: Context, extra?: ControllerExtraConfig) {
    super(data, context, extra);

    // get env data source config
    const server = getServerById<T2Server>(this.data.serverId, SERVER_TYPE.T2, this.context.env.server);
    if (server) {
      this.services = server;
    } else {
      this.setError(new SystemError(`T2 Configuration ${this.data.serverId} not found.`));
    }
    this.params = {
      body: this.data.body,
      options: { ...this.services?.options, ...this.data.options },
    };
  }

  /**
   * getBody
   * @returns {Record<string, unknown> | unknown[]}
   */
  private getBody(): Record<string, unknown> | unknown[] {
    if (typeof this.params.body === 'string') {
      const body = this.variable.replace(this.params.body);
      return JSON.parse(body);
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
    vmContext.post.getResultData = () => this.result?.data;
    vmContext.post.getResultCode = () => this.result?.errcode;

    return vmContext;
  }

  /**
   * @inheritdoc
   */
  protected async execute(): Promise<boolean> {
    try {
      const t2 = await getT2Pool(this.services);
      const timeout = this.data.config?.timeout || CONFIG.T2_DEFAULT_TIMEOUT;
      this.params.body = this.getBody();
      this.params.options = changeContentFromVariables(this.params.options, this.variable);

      this.beginTimer();
      const result = await timerExecute<Result>(
        t2.instance.send({
          ...this.params.options,
          functionNo: this.data.functionNo,
        }, this.params.body),
        timeout,
        `Execute timed out after ${timeout}ms, host = ${this.services.host}`,
      );
      this.totalTime = this.endTimer();
      this.result = result;
      if (result.errcode !== 0 && !this.data.assert?.length) {
        throw new ResponseError(getT2Error(result));
      }
      this.variable.setLocal('RESULT_DATA', result.data);
      this.variable.setLocal('RESULT_CODE', result.errcode);
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
  public async getExtraResult(): Promise<T2ExtraResult> {
    return {
      options: this.params?.options || this.data.options,
      functionNo: this.data.functionNo,
      serverId: this.data.serverId,
      serverName: this.services?.serverName,
      config: this.data.config,
    };
  }

  /**
   * @inheritdoc
   */
  public async getDetailResult(): Promise<T2DetailResult> {
    const base = await super.getDetailResult();
    return {
      ...base,
      body: this.params.body || this.data.body,
      result: this.result?.data,
      error: this.result && this.result.errcode !== 0 ? {
        errcode: this.result.errcode,
        errmsg: this.result.errmsg,
      } : undefined,
    };
  }

  /**
   * Create Init Result
   * @param base
   * @param data
   * @returns {MySQLResult}
   */
  public static createInitResult(base: BaseResult, data: T2ControllerData): T2Result {
    const result: T2Result = {
      ...base,
      type: CONTROLLER_TYPE.T2,
      extra: {
        functionNo: data.functionNo,
        options: data.options,
        serverId: data.serverId,
        config: data.config,
      },
    };
    return result;
  }
}
