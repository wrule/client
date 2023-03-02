/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import mysql from 'mysql2/promise';
import isSymbol from 'lodash/isSymbol';
import { MySQLControllerData, MySQLDataSource } from '@plugin/mysql/types/data';
import { MySQLResult, MySQLExtraResult, MySQLDetailResult, MySQLFields, MySQLRows, MySQLExecuteResult, MySQLExplainResult } from '@plugin/mysql/types/result';
import { execute, ExecuteResult } from '@plugin/mysql/utils';
import SingleController from '@engine/core/single';
import { BaseResult } from '@engine/core/types/result';
import { PreContext, PostContext } from '@engine/core/types/vm';
import { CONTROLLER_TYPE, DATA_SOURCE_TYPE } from '@engine/core/enum';
import { Context, ControllerExtraConfig } from '@engine/core/execute';
import { SocketInfo } from '@engine/utils/socket';
import { SystemError, ExecuteError } from '@engine/core/error';
import { getDataSourceByServer } from '@engine/core/utils';

interface MySQLProxyData {
  [key: string]: any;
}
interface ResultOptions {
  fields?: MySQLFields[];
  rows?: MySQLRows[];
  result?: MySQLExecuteResult;
  explain?: MySQLExplainResult;
  resultData?: MySQLProxyData;
  network?: SocketInfo;
  version?: string;
  command?: string;
}

/**
 * MySQL 步骤
 * @author William Chan <root@williamchan.me>
 */
export default class MySQLController extends SingleController<MySQLControllerData> {
  private command!: string;
  private readonly server!: MySQLDataSource;
  private readonly result: ResultOptions = {};

  /**
   * @inheritdoc
   */
  public constructor(data: MySQLControllerData, context: Context, extra?: ControllerExtraConfig) {
    super(data, context, extra);
    this.command = this.data.command;

    // get env data source config
    const server = getDataSourceByServer<MySQLDataSource>(this.data.serverId, this.context.env.dataSource);
    if (server && server.type === DATA_SOURCE_TYPE.MYSQL) {
      this.server = server;
    } else {
      this.setError(new SystemError(`MySQL Configuration ${this.data.serverId} not found.`));
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
      const result = await execute(this.server, command, this.data.config?.timeout, true);
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
    this.totalTime = result.totalTime;
    this.result.network = result.network;
    this.result.version = result.version;
    if (result.explain) {
      if (result.explain[1] && Array.isArray(result.explain[0])) {
        const explain: MySQLExplainResult = {
          fields: this.createFields(result.explain[1]),
          rows: result.explain[0],
        };
        this.result.explain = explain;
      }
    }
    if (result.rows && result.fields) {
      this.result.rows = result.rows;
      this.result.fields = this.createFields(result.fields);
      const proxyResult = new Proxy(this.result.rows, this.createProxyHandler());
      this.result.resultData = proxyResult;
      this.variable.setLocal('RESULT_DATA', proxyResult);
      this.variable.setLocal('RESULT_DATA_LENGTH', proxyResult.length);
    } else if (result.data) {
      const executeResult: MySQLExecuteResult = { ...result.data };
      this.result.result = executeResult;
      this.variable.setLocal('INSERT_ID', executeResult.insertId);
      this.variable.setLocal('AFFECT_ROWS', executeResult.affectedRows || 0);
      this.variable.setLocal('CHANGE_ROWS', executeResult.changedRows || 0);
    }
  }

  /**
   * Create fields
   * @fixme mysql2 typescript not fully supported
   * @param item
   * @returns {MySQLFields[]}
   */
  private createFields(fields: mysql.FieldPacket[] | any): MySQLFields[] {
    if (Array.isArray(fields)) {
      return fields.map((field): MySQLFields => ({
        name: field.name,
        characterSet: field.characterSet,
        columnLength: field.columnLength,
        columnType: field.columnType,
        decimals: field.decimals,
        encoding: field.encoding,
        flags: field.flags,
      }));
    }
    return [];
  }

  /**
   * create proxy handler
   * @returns {ProxyHandler<MySQLProxyData[]>}
   */
  private createProxyHandler(): ProxyHandler<MySQLProxyData[]> {
    return {
      get: (target, prop, receiver) => {
        if (prop === 'length') {
          return target.length;
        }
        if (!isSymbol(prop)) {
          const dat = target[prop as unknown as number];
          if (dat && Array.isArray(dat)) {
            const data: MySQLProxyData = {};
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
  public async getExtraResult(): Promise<MySQLExtraResult> {
    const options = this.server || {};
    return {
      user: options.user,
      host: options.host,
      port: options.port,
      database: options.config?.database,
      charset: options.config?.charset,
      network: this.result.network,
      version: this.result.version,
      serverId: this.data.serverId,
      serverName: this.server?.serverName,
    };
  }

  /**
   * @inheritdoc
   */
  public async getDetailResult(): Promise<MySQLDetailResult> {
    const base = await super.getDetailResult();
    const data = this.result.fields && this.result.rows ? {
      fields: this.result.fields,
      rows: this.result.rows,
    } : undefined;
    return {
      ...base,
      data,
      result: this.result.result,
      explain: this.result.explain,
      command: this.result.command || this.getCommand(),
    };
  }

  /**
   * Create Init Result
   * @param base
   * @param data
   * @returns {MySQLResult}
   */
  public static createInitResult(base: BaseResult, data: MySQLControllerData): MySQLResult {
    const result: MySQLResult = {
      ...base,
      type: CONTROLLER_TYPE.MYSQL,
      extra: {
        serverId: data.serverId,
      },
    };
    return result;
  }
}
