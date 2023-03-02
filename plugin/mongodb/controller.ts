/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { getPool } from '@plugin/mongodb/pool';
import { MongoDBControllerData, MongoDBDataSource } from '@plugin/mongodb/types/data';
import { MongoDBResult, MongoDBExtraResult, MongoDBDetailResult } from '@plugin/mongodb/types/result';
import { deserializeBSON } from '@plugin/mongodb/utils';
import { PreContext, PostContext } from '@engine/core/types/vm';
import SingleController from '@engine/core/single';
import { BaseResult } from '@engine/core/types/result';
import { CONTROLLER_TYPE, DATA_SOURCE_TYPE } from '@engine/core/enum';
import { getDataSourceByServer, timerExecute } from '@engine/core/utils';
import { ExecuteError, SystemError } from '@engine/core/error';
import { Context, ControllerExtraConfig } from '@engine/core/execute';
import { CONFIG } from '@engine/config';

interface ResultOptions {
  // network?: SocketInfo;
  bson?: any;
  result?: any;
  version?: string;
  command?: string;
}

/**
 * MongoDB 步骤
 * @author William Chan <root@williamchan.me>
 */
export default class MongoDBController extends SingleController<MongoDBControllerData> {
  private command!: string;
  private readonly server!: MongoDBDataSource;
  private readonly result: ResultOptions = {};

  /**
   * @inheritdoc
   */
  public constructor(data: MongoDBControllerData, context: Context, extra?: ControllerExtraConfig) {
    super(data, context, extra);
    this.command = this.data.command;

    // get env data source config
    const server = getDataSourceByServer<MongoDBDataSource>(this.data.serverId, this.context.env.dataSource);
    if (server && server.type === DATA_SOURCE_TYPE.MONGODB) {
      this.server = server;
    } else {
      this.setError(new SystemError(`MongoDB Configuration ${this.data.serverId} not found.`));
    }
  }

  /**
   * create pre script context & method
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
   * @returns
   */
  protected createPostVMContext(): PostContext {
    const vmContext = Object.create(null) as PostContext;
    vmContext.post = Object.create(null);
    vmContext.post.getResultAsBSON = () => this.result.bson;
    vmContext.post.getResultAsJSON = () => this.result.result;
    return vmContext;
  }

  private getCommand(): string {
    return this.variable.replace(this.command);
  }

  /**
   * @inheritdoc
   */
  protected async execute(): Promise<boolean> {
    try {
      const commandString = this.getCommand();
      if (commandString) {
        const client = await getPool(this.server);
        if (this.server.config?.database) {
          await client.instance.evaluate(`use ${this.server.config.database}`);
        }
        this.beginTimer();
        const result = await timerExecute(
          client.instance.evaluate(commandString),
          this.data.config?.timeout || CONFIG.MONGODB_DEFAULT_COMMAND_TIMEOUT,
        );
        this.totalTime = this.endTimer();
        // console.log(result);
        const data = result.type !== 'Cursor' ? result.printable : result.printable.documents;
        // console.log(data);
        // console.log(parseBson(data));
        // const data = parseBson(result);
        // console.log('---------------');
        // console.log(data);
        // console.log(await transform(data));
        // console.log('---------------');
        // console.log(JSON.parse(JSON.stringify(data)));
        const json = deserializeBSON(data);
        // console.log(json);

        this.result.bson = data;
        this.result.result = json;
        this.result.command = commandString;
        this.result.version = client.version;
        this.variable.setLocal('RESULT_DATA', json);
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
  public async getExtraResult(): Promise<MongoDBExtraResult> {
    const options = this.server || {};
    return {
      user: options.user,
      host: options.host,
      port: options.port,
      database: options.config?.database,
      // network: this.result.network,
      version: this.result.version,
      serverId: this.data.serverId,
      serverName: this.server?.serverName,
    };
  }

  /**
   * @inheritdoc
   */
  public async getDetailResult(): Promise<MongoDBDetailResult> {
    const base = await super.getDetailResult();
    return {
      ...base,
      result: this.result.result,
      command: this.result.command || this.getCommand(),
    };
  }

  /**
   * Create Init Result
   * @param base
   * @param data
   * @returns {MongoDBResult}
   */
  public static createInitResult(base: BaseResult, data: MongoDBControllerData): MongoDBResult {
    const result: MongoDBResult = {
      ...base,
      type: CONTROLLER_TYPE.MONGODB,
      extra: {
        serverId: data.serverId,
      },
    };
    return result;
  }
}
