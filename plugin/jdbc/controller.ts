/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import isSymbol from 'lodash/isSymbol';
import { JDBCControllerData, JDBCDataSource } from '@plugin/jdbc/types/data';
import { JDBCResult, JDBCExtraResult, JDBCDetailResult, JDBCFields, JDBCRows, JDBCExecuteResult } from '@plugin/jdbc/types/result';
import { execute, ExecuteResult } from '@plugin/jdbc/utils';
import SingleController from '@engine/core/single';
import { BaseResult } from '@engine/core/types/result';
import { PreContext, PostContext } from '@engine/core/types/vm';
import { CONTROLLER_TYPE, DATA_SOURCE_TYPE } from '@engine/core/enum';
import { Context, ControllerExtraConfig } from '@engine/core/execute';
import { SystemError, ExecuteError } from '@engine/core/error';
import { getDataSourceByServer } from '@engine/core/utils';
import { SocketInfo } from '@engine/utils/socket';
import Logger from '@/logger';
import flog from '@/utils/jmlog';

interface JDBCProxyData {
  [key: string]: any;
}
interface ResultOptions {
  fields?: JDBCFields[];
  rows?: JDBCRows[];
  result?: JDBCExecuteResult;
  resultData?: JDBCProxyData;
  network?: SocketInfo;
  version?: string;
  command?: string;
}

/**
 * JDBC 步骤
 * @author William Chan <root@williamchan.me>
 */
export default class JDBCController extends SingleController<JDBCControllerData> {
  private command!: string;
  private readonly server!: JDBCDataSource;
  private readonly result: ResultOptions = {};

  /**
   * @inheritdoc
   */
  public constructor(data: JDBCControllerData, context: Context, extra?: ControllerExtraConfig) {
    super(data, context, extra);
    this.command = this.data.command;

    // get env data source config
    const server = getDataSourceByServer<JDBCDataSource>(this.data.serverId, this.context.env.dataSource);
    if (server && server.type === DATA_SOURCE_TYPE.JDBC) {
      this.server = server;
      this.subType = server.subType;
    } else {
      this.setError(new SystemError(`JDBC Configuration ${this.data.serverId} not found.`));
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
      flog('[JDBC-execute]');
      const command = this.getCommand();
      const result = await execute(this.server, command, this.data.config?.timeout);
      this.totalTime = result.totalTime;
      flog('[JDBC-execute-ok]');
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
    flog('[JDBC-responseHandler]', result);
    this.result.command = result.command;
    // this.totalTime = result.totalTime;
    // this.result.network = result.network;
    // this.result.version = result.version;
    // if (result.explain) {
    //   if (result.explain[1] && Array.isArray(result.explain[0])) {
    //     const explain: MySQLExplainResult = {
    //       fields: this.createFields(result.explain[1]),
    //       rows: result.explain[0],
    //     };
    //     this.result.explain = explain;
    //   }
    // }
    if (result.rows && result.fields) {
      flog('[JDBC-AFFECT_ROWS-1]');
      this.result.rows = result.rows;
      // this.result.fields = this.createFields(result.fields);
      this.result.fields = result.fields;
      const proxyResult = new Proxy(this.result.rows, this.createProxyHandler());
      this.result.resultData = proxyResult;
      this.variable.setLocal('RESULT_DATA', proxyResult);
      this.variable.setLocal('RESULT_DATA_LENGTH', proxyResult.length);
    } else if (result.data) {
      flog('[JDBC-AFFECT_ROWS-2]');
      const executeResult: JDBCExecuteResult = { ...result.data };
      this.result.result = executeResult;
      flog('[JDBC-AFFECT_ROWS-3]', executeResult);
      this.variable.setLocal('AFFECT_ROWS', executeResult.rowsAffected);
    }
  }

  // /**
  //  * Create fields
  //  * @fixme mysql2 typescript not fully supported
  //  * @param item
  //  * @returns {MySQLFields[]}
  //  */
  // private createFields(fields: mysql.FieldPacket[] | any): MySQLFields[] {
  //   if (Array.isArray(fields)) {
  //     return fields.map((field): MySQLFields => ({
  //       name: field.name,
  //       characterSet: field.characterSet,
  //       columnLength: field.columnLength,
  //       columnType: field.columnType,
  //       decimals: field.decimals,
  //       encoding: field.encoding,
  //       flags: field.flags,
  //     }));
  //   }
  //   return [];
  // }

  /**
   * create proxy handler
   * @returns {ProxyHandler<JDBCProxyData[]>}
   */
  private createProxyHandler(): ProxyHandler<JDBCProxyData[]> {
    return {
      get: (target, prop, receiver) => {
        if (prop === 'length') {
          return target.length;
        }
        if (!isSymbol(prop)) {
          const dat = target[prop as unknown as number];
          if (dat && Array.isArray(dat)) {
            const data: JDBCProxyData = {};
            const fields = this.result.fields || [];
            fields.forEach((item, index) => {
              data[item.name] = dat[index];
              data[item.column] = dat[index];
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
  public async getExtraResult(): Promise<JDBCExtraResult> {
    const options = this.server || {};
    return {
      user: options.user,
      host: options.host,
      port: options.port,
      database: options.config?.database,
      serverId: this.data.serverId,
      serverName: this.server?.serverName,
      subType: this.server?.subType,
    };
  }

  /**
   * @inheritdoc
   */
  public async getDetailResult(): Promise<JDBCDetailResult> {
    const base = await super.getDetailResult();
    const data = this.result.fields && this.result.rows ? {
      fields: this.result.fields,
      rows: this.result.rows,
    } : undefined;
    const rt = {
      ...base,
      data,
      result: this.result.result,
      command: this.result.command || this.getCommand(),
    };
    return rt;
  }

  /**
   * Create Init Result
   * @param base
   * @param data
   * @returns {JDBCResult}
   */
  public static createInitResult(base: BaseResult, data: JDBCControllerData): JDBCResult {
    const result: JDBCResult = {
      ...base,
      type: CONTROLLER_TYPE.JDBC,
      extra: {
        serverId: data.serverId,
      },
    };
    return result;
  }
}
