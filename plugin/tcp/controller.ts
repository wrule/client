/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { TCPControllerData, TCPControllerOptions } from '@plugin/tcp/types/data';
import { TCPDetailResult, TCPResult, TCPExtraResult } from '@plugin/tcp/types/result';
import { getPool } from '@plugin/tcp/pool';
import Connection from '@plugin/tcp/connection/connection';
import { SystemError, ExecuteError } from '@engine/core/error';
import SingleController from '@engine/core/single';
import { PreContext, PostContext } from '@engine/core/types/vm';
import { BaseResult } from '@engine/core/types/result';
import { CONTROLLER_TYPE } from '@engine/core/enum';
import { Context, ControllerExtraConfig } from '@engine/core/execute';
import VM, { VMResult, VMError } from '@engine/vm';
import { timerExecute, getServerById } from '@engine/core/utils';
import { encodeContentType } from '@engine/utils/serialize/type';
import { getSocketInfo } from '@engine/utils/socket';
import { SERVER_TYPE, TCPServer } from '@engine/dispatch/types/server';
import { CONFIG } from '@engine/config';
import SystemEventQueue from '@engine/utils/queue';

interface Options extends TCPControllerOptions {
  readonly port: number | string;
  readonly host: string;
  readonly tls?: boolean;
  data: string;
  readonly serverName?: string;
}

interface Result extends TCPDetailResult, TCPExtraResult {
  data: string;
}

/**
 * TCP 步骤
 * @author William Chan <root@williamchan.me>
 */
export default class TCPController extends SingleController<TCPControllerData> {
  private result!: Result;
  private options!: Options;
  private connection!: Connection;

  /**
   * @inheritdoc
   */
  public constructor(data: TCPControllerData, context: Context, extra?: ControllerExtraConfig) {
    super(data, context, extra);
    if (this.data.serverId) {
      // eslint-disable-next-line max-len
      const server = getServerById<TCPServer>(this.data.serverId, SERVER_TYPE.TCP, this.context.env.server);
      if (server) {
        this.options = {
          host: server.host,
          port: server.port,
          tls: server.tls,
          serverName: server.serverName,
          checkEOF: this.context.env.script?.find((item) => item.scriptId === server.checkEOFScriptId)?.script,
          encode: this.context.env.script?.find((item) => item.scriptId === server.encodeScriptId)?.script,
          decode: this.context.env.script?.find((item) => item.scriptId === server.decodeScriptId)?.script,
          data: this.data.data,
        };
      } else {
        this.setError(new SystemError(`Server Configuration ${this.data.serverId} not found.`));
      }
    } else {
      this.options = this.data as Options;
    }
    this.result = {
      data: this.data.data,
      checkEOF: [],
    };
  }

  /**
   * create pre script context & method
   */
  protected createPreVMContext(): PreContext {
    const vmContext = Object.create(null) as PreContext;
    vmContext.pre = Object.create(null);
    vmContext.pre.getData = () => this.variable.replace(this.options.data);
    vmContext.pre.setData = (data: string) => {
      this.options.data = data;
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
    if (this.result.result) {
      vmContext.post.getResultData = (): unknown => this.result.result;
      vmContext.post.getResultRawData = (): unknown => this.result.hexResult;
    }
    return vmContext;
  }

  /**
   * 发送数据
   * @param buf
   * @returns
   */
  private async request(buf: Buffer): Promise<Buffer> {
    const queue = new SystemEventQueue();
    let hexResult = Buffer.alloc(0);
    let userData = Buffer.alloc(0);

    this.connection.on('data', (data) => {
      hexResult = Buffer.concat([hexResult, data]);
      queue.push(data);
    });
    this.connection.on('retry', () => {
      hexResult = Buffer.alloc(0);
      userData = Buffer.alloc(0);
      this.result.checkEOF = [];
    });
    this.connection.on('error', (err) => {
      this.setError(new ExecuteError(err));
      this.connection.release();
      queue.stop(); // 队列正常 但连接挂了
    });

    queue.on('result', (data: VMError | VMResult) => {
      if (data) {
        if (data instanceof VMError) {
          // eslint-disable-next-line no-param-reassign
          delete data.data.return;
          this.result.checkEOF.push({ script: this.options.checkEOF as string, ...data.data });
          // this.setError(new SystemError(data));
          this.connection.release();
          queue.stop(2);
        } else {
          const ret = data.return;
          // eslint-disable-next-line no-param-reassign
          delete data.return; // 否则要处理用户可能造成的循环依赖
          this.result.checkEOF.push({ script: this.options.checkEOF as string, ...data });
          if (ret === true) {
            this.connection.release();
            queue.stop();
          }
        }
      } else {
        this.connection.release();
        queue.stop();
      }
    });

    const execute = queue.start<VMError | VMResult>(async (data: Buffer) => {
      if (this.options.checkEOF) {
        try {
          const ret = await VM.spawn(this.options.checkEOF, {
            context: {
              ...this.createGlobalVMContext(),
              data: Buffer.concat([userData, data]),
              send: (buffer: Buffer) => this.connection.write(buffer),
            },
            async: true,
          });
          if (Buffer.isBuffer(ret.return)) {
            userData = ret.return;
          }
          return ret;
        } catch (e) {
          return e;
        }
      }
    });

    this.connection.write(buf);

    try {
      const timeout = this.data.config?.timeout || CONFIG.TCP_DEFAULT_CONNECT_TIMEOUT;
      await timerExecute<any>(execute, timeout, `Execution timed out after ${timeout}ms, send data timeout or no response.`);
      return hexResult;
    } catch (e) {
      this.connection.release();
      queue.stop();
      throw new ExecuteError(e);
    }
  }

  /**
   * 内容编码
   * @param data
   * @returns
   */
  private async encode(data: string): Promise<Buffer> {
    if (this.options.encode) {
      try {
        const ret = await VM.spawn(this.options.encode, {
          context: { ...this.createGlobalVMContext(), data }, async: true,
        });

        if (ret.return === undefined) {
          throw new Error('Encoding script output content is empty, please check script.');
        }
        this.result.encode = { script: this.options.encode, ...ret };
        return Buffer.from(ret.return);
      } catch (err) {
        this.result.encode = { script: this.options.encode, ...err.data };
        throw err;
      }
    }
    return Buffer.from(data);
  }

  /**
   * 内容解码
   * @param data
   * @returns
   */
  private async decode(data: Buffer): Promise<any> {
    if (this.options.decode) {
      try {
        const ret = await VM.spawn(this.options.decode, {
          context: { ...this.createGlobalVMContext(), data }, async: true,
        });
        this.result.decode = { script: this.options.decode, ...ret };
        return ret.return;
      } catch (err) {
        this.result.decode = { script: this.options.decode, ...err.data };
        throw err;
      }
    }
    return data;
  }

  /**
   * @inheritdoc
   */
  protected async execute(): Promise<boolean> {
    if (this.options.host && this.options.port) {
      this.beginTimer();
      try {
        const client = await getPool({ ...this.options, config: this.data.config /** session: this.context.uuid */ });
        this.connection = await client.instance.connect();
        this.result.network = getSocketInfo(this.connection.socket);
      } catch (e) {
        throw new ExecuteError(e);
      }
      this.result.data = this.variable.replace(this.options.data);
      this.result.hexData = await this.encode(this.result.data);
      this.result.hexResult = await this.request(this.result.hexData);
      this.totalTime = this.endTimer();

      const result = await this.decode(this.result.hexResult);
      this.result.result = encodeContentType(result);

      this.variable.setLocal('RESULT_DATA', result);
      return true;
    }
    throw new SystemError('Please input host and port');
  }

  //  -------------------------------- 结果相关 --------------------------------

  /**
   * @inheritdoc
   */
  public async getExtraResult(): Promise<TCPExtraResult> {
    return {
      serverId: this.data.serverId,
      serverName: this.options.serverName,
      port: this.options.port,
      host: this.options.host,
      tls: this.options.tls,
      network: this.result.network,
      config: this.data.config,
    };
  }

  /**
   * @inheritdoc
   */
  public async getDetailResult(): Promise<TCPDetailResult> {
    const base = await super.getDetailResult();
    return {
      ...base,
      checkEOF: this.result.checkEOF,
      encode: this.result.encode,
      decode: this.result.decode,
      data: this.result.data,
      hexData: this.result.hexData,
      result: this.result.result,
      hexResult: this.result.hexResult,
    };
  }

  /**
   * Create Init Result
   * @param base
   * @param data
   * @returns {TCPResult}
   */
  public static createInitResult(base: BaseResult, data: TCPControllerData): TCPResult {
    const result: TCPResult = {
      ...base,
      type: CONTROLLER_TYPE.TCP,
      extra: {
        serverId: data.serverId,
        port: data.port,
        host: data.host,
        tls: data.tls,
        config: data.config,
      },
    };
    return result;
  }
}
