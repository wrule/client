/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import isSymbol from 'lodash/isSymbol';
import { PostgreSQLControllerData, PostgreSQLDataSource } from '@plugin/postgresql/types/data';
import { PostgreSQLResult, PostgreSQLExtraResult, PostgreSQLDetailResult, PostgreSQLFields, PostgreSQLRows, PostgreSQLExecuteResult } from '@plugin/postgresql/types/result';
import { execute, ExecuteResult } from '@plugin/postgresql/utils';
import SingleController from '@engine/core/single';
import { BaseResult } from '@engine/core/types/result';
import { PreContext, PostContext } from '@engine/core/types/vm';
import { CONTROLLER_TYPE, DATA_SOURCE_TYPE } from '@engine/core/enum';
import { Context, ControllerExtraConfig } from '@engine/core/execute';
import { SystemError, ExecuteError } from '@engine/core/error';
import { getDataSourceByServer } from '@engine/core/utils';
import { SocketInfo } from '@engine/utils/socket';

interface PostgreSQLProxyData {
  [key: string]: any;
}
interface ResultOptions {
  fields?: PostgreSQLFields[];
  rows?: PostgreSQLRows[];
  result?: PostgreSQLExecuteResult;
  resultData?: PostgreSQLProxyData;
  network?: SocketInfo;
  version?: string;
  command?: string;
}

/**
 * PostgreSQL 步骤
 * @author William Chan <root@williamchan.me>
 */
export default class PostgreSQLController extends SingleController<PostgreSQLControllerData> {
  private command!: string;
  private readonly server!: PostgreSQLDataSource;
  private readonly result: ResultOptions = {};

  /**
   * @inheritdoc
   */
  public constructor(data: PostgreSQLControllerData, context: Context, extra?: ControllerExtraConfig) {
    super(data, context, extra);
    this.command = this.data.command;

    // get env data source config
    const server = getDataSourceByServer(this.data.serverId, this.context.env.dataSource);
    if (server && server.type === DATA_SOURCE_TYPE.POSTGRESQL) {
      this.server = server;
    } else {
      this.setError(new SystemError(`PostgreSQL Configuration ${this.data.serverId} not found.`));
    }
  }

  private getCommand(): string {
    return this.variable.replace(this.command);
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
    vmContext.post.getResultData = () => this.result.resultData;
    vmContext.post.getFields = () => this.result.fields;
    vmContext.post.getRows = () => this.result.rows;
    vmContext.post.getResult = () => this.result.result;
    // vmContext.post.getExplain = () => this.result.explain;
    return vmContext;
  }

  /**
   * @inheritdoc
   */
  protected async execute(): Promise<boolean> {
    try {
      const command = this.getCommand();
      const result = await execute(this.server, command, this.data.config?.timeout);
      this.totalTime = result.totalTime;
      this.responseHandler(result);
    } catch (e) {
      throw new ExecuteError(e);
    }
    return true;
  }

  /**
   * response handler
   * @param result
   */
  private responseHandler(result: ExecuteResult): void {
    this.result.command = result.command;
    this.result.network = result.network;
    this.result.version = result.version;
    if (result.rows && result.fields) {
      this.result.rows = result.rows;
      this.result.fields = result.fields;
      const proxyResult = new Proxy(this.result.rows, this.createProxyHandler());
      this.result.resultData = proxyResult;
      this.variable.setLocal('RESULT_DATA', proxyResult);
      this.variable.setLocal('RESULT_DATA_LENGTH', proxyResult.length);
    } else if (result.data) {
      const executeResult: PostgreSQLExecuteResult = { ...result.data };
      this.result.result = executeResult;
      this.variable.setLocal('AFFECT_ROWS', executeResult.rowsAffected);
    }
  }

  /**
   * create proxy handler
   * @returns {ProxyHandler<PostgreSQLProxyData[]>}
   */
  private createProxyHandler(): ProxyHandler<PostgreSQLProxyData[]> {
    return {
      get: (target, prop, receiver) => {
        if (prop === 'length') {
          return target.length;
        }
        if (!isSymbol(prop)) {
          const dat = target[prop as unknown as number];
          if (dat && Array.isArray(dat)) {
            const data: PostgreSQLProxyData = {};
            const fields = this.result.fields || [];
            fields.forEach((item, index) => {
              data[item.name] = dat[index];
            });
            return data;
          }
        }
        return Reflect.get(target, prop, receiver);
      },
    };
  }

  //  -------------------------------- 结果相关 --------------------------------

  /**
   * @inheritdoc
   */
  public async getExtraResult(): Promise<PostgreSQLExtraResult> {
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
  public async getDetailResult(): Promise<PostgreSQLDetailResult> {
    const base = await super.getDetailResult();
    const data = this.result.fields && this.result.rows ? {
      fields: this.result.fields,
      rows: this.result.rows,
    } : undefined;
    return {
      ...base,
      data,
      result: this.result.result,
      command: this.result.command || this.getCommand(),
    };
  }

  /**
   * Create Init Result
   * @param base
   * @param data
   * @returns {PostgreSQLResult}
   */
  public static createInitResult(base: BaseResult, data: PostgreSQLControllerData): PostgreSQLResult {
    const result: PostgreSQLResult = {
      ...base,
      type: CONTROLLER_TYPE.POSTGRESQL,
      extra: {
        serverId: data.serverId,
      },
    };
    return result;
  }
}
