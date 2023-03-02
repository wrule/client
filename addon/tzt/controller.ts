/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import iconv from 'iconv-lite';
import { TZTControllerData } from '@addon/tzt/types/data';
import { TZTResult, TZTExtraResult, TZTDetailResult } from '@addon/tzt/types/result';
import { getTZTPool } from '@addon/tzt/pool';
import SingleController from '@engine/core/single';
import { BaseResult } from '@engine/core/types/result';
import { PreContext, PostContext } from '@engine/core/types/vm';
import { CONTROLLER_TYPE } from '@engine/core/enum';
import { Context, ControllerExtraConfig } from '@engine/core/execute';
import { getServerById, timerExecute, changeContentFromVariables } from '@engine/core/utils';
import { SystemError, ExecuteError, ResponseError } from '@engine/core/error';
import { SERVER_TYPE } from '@engine/dispatch/types/server';
import { TZTServer } from '@addon/tzt/types';

const encode = (data: Record<string, string | Buffer>): Buffer => {
  // 先转gb2312 并计算长度
  let length = 0;
  Object.keys(data).forEach((key) => {
    const item = data[key];
    if (typeof item !== 'string' && !Buffer.isBuffer(item)) {
      // @ts-ignore
      // eslint-disable-next-line no-param-reassign
      data[key] = item.toString();
    }
    if (typeof item === 'string') {
      // eslint-disable-next-line no-param-reassign
      data[key] = iconv.encode(item, 'gb2312');
    }
    length += 1 + key.length + 4 + data[key].length;
  });
  // 报文格式 keyLen(1字节) + key + valueLen + value
  const buffer = Buffer.alloc(length);
  let offset = 0;
  Object.keys(data).forEach((key) => {
    buffer.writeUInt8(key.length, offset);
    offset += 1;
    buffer.write(key, offset);
    offset += key.length;
    buffer.writeUInt32LE(data[key].length, offset);
    offset += 4;
    // @ts-ignore
    data[key].copy(buffer, offset);
    offset += data[key].length;
  });
  return buffer;
};

const decode = (buffer: Buffer): Record<string, string> => {
  const obj: Record<string, string> = {};
  let offset = 0;
  while (offset < buffer.byteLength) {
    const keyLen = buffer.readUInt8(offset);
    offset += 1;
    const key = buffer.toString('utf-8', offset, offset + keyLen);
    offset += keyLen;
    const valueLen = buffer.readUint32LE(offset);
    offset += 4;
    const value = iconv.decode(buffer.slice(offset, offset + valueLen), 'gb2312');
    offset += valueLen;
    obj[key] = value;
  }
  return obj;
};

/**
 * TZT 步骤
 * @author William Chan <root@williamchan.me>
 */
export default class TZTController extends SingleController<TZTControllerData> {
  private readonly services!: TZTServer;
  private result?: Record<string, string>;
  private readonly params!: {
    data?: Record<string, string | Buffer> | string;
  };

  /**
   * @inheritdoc
   */
  public constructor(data: TZTControllerData, context: Context, extra?: ControllerExtraConfig) {
    super(data, context, extra);
    if (this.data.serverId) {
    // get env data source config
      const server = getServerById<TZTServer>(this.data.serverId, SERVER_TYPE.TZT, this.context.env.server);
      if (server) {
        this.services = server;
      } else {
        this.setError(new SystemError(`TZT Configuration ${this.data.serverId} not found.`));
      }
    } else {
      if (this.data.host && this.data.port) {
        this.services = {
          host: this.data.host,
          port: this.data.port.toString(),
        } as TZTServer;
      }
    }
    this.params = {
      data: this.data.data,
    };
  }

  private getBody(): Record<string, string> {
    if (typeof this.params.data === 'string') {
      const body = this.variable.replace(this.params.data);
      return JSON.parse(body);
    }
    return changeContentFromVariables(this.params.data, this.variable);
  }

  /**
   * create pre script context & method
   */
  protected createPreVMContext(): PreContext {
    const vmContext = Object.create(null) as PreContext;
    vmContext.pre = Object.create(null);
    vmContext.pre.setBody = (body: any) => {
      this.params.data = body;
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
    vmContext.post.getResultData = () => this.result;

    return vmContext;
  }

  /**
   * @inheritdoc
   */
  protected async execute(): Promise<boolean> {
    try {
      const tzt = await getTZTPool(this.services);
      const timeout = this.data.config?.timeout || 5000;
      this.params.data = this.getBody();

      this.beginTimer();
      const result = await timerExecute<Buffer>(
        // @ts-ignore
        tzt.instance.send(this.services.host, this.services.port, encode(this.params.data)),
        timeout,
        `Execute timed out after ${timeout}ms, host = ${this.services.host}`,
      );
      this.totalTime = this.endTimer();
      this.result = decode(result);
      this.variable.setLocal('RESULT_DATA', this.result);
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
  public async getExtraResult(): Promise<TZTExtraResult> {
    return {
      serverId: this.data.serverId,
      serverName: this.services?.serverName,
      config: this.data.config,
      host: this.services?.host,
      port: this.services?.port,
    };
  }

  /**
   * @inheritdoc
   */
  public async getDetailResult(): Promise<TZTDetailResult> {
    const base = await super.getDetailResult();
    return {
      ...base,
      data: this.params.data || this.data.data,
      result: this.result,
    };
  }

  /**
   * Create Init Result
   * @param base
   * @param data
   * @returns {MySQLResult}
   */
  public static createInitResult(base: BaseResult, data: TZTControllerData): TZTResult {
    const result: TZTResult = {
      ...base,
      type: CONTROLLER_TYPE.TZT,
      extra: {
        serverId: data.serverId,
        config: data.config,
      },
    };
    return result;
  }
}
