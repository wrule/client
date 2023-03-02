/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import IORedis from 'ioredis';
import { RedisControllerData, RedisDataSource } from '@plugin/redis/types/data';
import { RedisResult, RedisExtraResult, RedisDetailResult } from '@plugin/redis/types/result';
import { BaseResult } from '@engine/core/types/result';
import { PreContext, PostContext } from '@engine/core/types/vm';
import { getPool } from '@plugin/redis/pool';
import SingleController from '@engine/core/single';
import { CONTROLLER_TYPE, DATA_SOURCE_TYPE } from '@engine/core/enum';
import { Context, ControllerExtraConfig } from '@engine/core/execute';
import { ExecuteError, SystemError } from '@engine/core/error';
import { getSocketInfo, SocketInfo } from '@engine/utils/socket';
import { command2Array } from '@engine/utils/string';
import { getDataSourceByServer, timerExecute } from '@engine/core/utils';
import { CONFIG } from '@engine/config';

IORedis.Command.setReplyTransformer('HGETALL', (result) => {
  if (Array.isArray(result)) {
    const obj: Record<string, string> = {};
    for (let i = 0; i < result.length; i += 2) {
      obj[result[i]] = result[i + 1];
    }
    return obj;
  }
  return result;
});

interface ResultOptions {
  network?: SocketInfo;
  result?: any;
  version?: string;
  command?: string | string[];
}
/**
 * Redis 步骤
 * @author William Chan <root@williamchan.me>
 */
export default class RedisController extends SingleController<RedisControllerData> {
  private command!: string | string[];
  private readonly server!: RedisDataSource;
  private readonly result: ResultOptions = {};

  /**
   * @inheritdoc
   */
  public constructor(data: RedisControllerData, context: Context, extra?: ControllerExtraConfig) {
    super(data, context, extra);
    this.command = this.data.command;

    // get env data source config
    const server = getDataSourceByServer(this.data.serverId, this.context.env.dataSource);
    if (server && server.type === DATA_SOURCE_TYPE.REDIS) {
      this.server = server;
    } else {
      this.setError(new SystemError(`Redis Configuration ${this.data.serverId} not found.`));
    }
  }

  private getCommand(): string | string[] {
    if (typeof this.command === 'string') {
      return this.variable.replace(this.command);
    }
    return this.command.map((args) => this.variable.replace(args));
  }

  /**
   * create pre script context & method
   * @returns {PreContext}
   */
  protected createPreVMContext(): PreContext {
    const vmContext = Object.create(null) as PreContext;
    vmContext.pre = Object.create(null);
    vmContext.pre.getCommand = () => this.getCommand();
    vmContext.pre.setCommand = (command: string) => {
      this.command = command;
    };
    return vmContext;
  }

  /**
   * create post script context & method
   * @returns {PostContext}
   * @todo
   */
  protected createPostVMContext(): PostContext {
    const vmContext = Object.create(null) as PostContext;
    vmContext.post = Object.create(null);
    vmContext.post.getResultData = () => this.result.result;
    return vmContext;
  }

  /**
   * @inheritdoc
   */
  protected async execute(): Promise<boolean> {
    try {
      const client = await getPool(this.server);
      const commandOrigin = this.getCommand();
      const commandArray = typeof commandOrigin === 'string' ? command2Array(commandOrigin) : commandOrigin;
      if (commandArray[0]) {
        const commandArgs = commandArray.splice(1);
        this.beginTimer();
        const result = await timerExecute(
          client.instance.call(commandArray[0].toLocaleUpperCase(), ...commandArgs),
          this.data.config?.timeout || CONFIG.REDIS_DEFAULT_COMMAND_TIMEOUT,
        );
        this.totalTime = this.endTimer();
        // @ts-ignore
        this.result.network = getSocketInfo(client.stream);
        this.result.command = [commandArray[0], ...commandArgs];
        this.result.result = result;
        this.result.version = client.version;
        this.variable.setLocal('RESULT_DATA', result);
      } else {
        throw new ExecuteError('Command is empty');
      }
    } catch (e) {
      throw new ExecuteError(e);
    }
    return true;
  }

  //  -------------------------------- 结果相关 --------------------------------

  /**
   * @inheritdoc
   */
  public async getExtraResult(): Promise<RedisExtraResult> {
    const options = this.server || {};
    return {
      user: options.user,
      host: options.host,
      port: options.port,
      database: options.config?.database,
      network: this.result.network,
      version: this.result.version,
      serverId: this.data.serverId,
      serverName: this.server?.serverName,
    };
  }

  /**
   * @inheritdoc
   */
  public async getDetailResult(): Promise<RedisDetailResult> {
    const base = await super.getDetailResult();
    const cmd = this.result.command || this.getCommand();
    let command!: string;

    if (typeof cmd === 'string') {
      command = cmd;
    } else {
      command = cmd.map((item) => {
        if (
          item.indexOf(' ') !== -1
          || item.indexOf('"') !== -1
          || item.indexOf("'") !== -1
        ) {
          return JSON.stringify(item);
        }
        return item;
      }).join(' ');
    }
    return {
      ...base,
      command,
      result: this.result.result,
    };
  }

  /**
   * Create Init Result
   * @param base
   * @param data
   * @returns {RedisResult}
   */
  public static createInitResult(base: BaseResult, data: RedisControllerData): RedisResult {
    const result: RedisResult = {
      ...base,
      type: CONTROLLER_TYPE.REDIS,
      extra: {
        serverId: data.serverId,
      },
    };
    return result;
  }
}
