/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { GetMessage, Channel } from 'amqplib';
import { getPool } from '@plugin/rabbitmq/pool';
import { RabbitMQControllerData, RabbitMQDataSource } from '@plugin/rabbitmq/types/data';
import { RabbitMQResult, RabbitMQExtraResult, RabbitMQDetailResult, MessagePropertyHeaders } from '@plugin/rabbitmq/types/result';
import SingleController from '@engine/core/single';
import { BaseResult } from '@engine/core/types/result';
import { PreContext, PostContext } from '@engine/core/types/vm';
import { CONTROLLER_TYPE, DATA_SOURCE_TYPE } from '@engine/core/enum';
import { Context, ControllerExtraConfig } from '@engine/core/execute';
import { SystemError, ExecuteError } from '@engine/core/error';
import { getDataSourceByServer } from '@engine/core/utils';
import { getSocketInfo, SocketInfo } from '@engine/utils/socket';

interface ResultOptions {
  content?: string | Buffer;
  properties?: MessagePropertyHeaders;
  result?: string;
  raw?: Buffer;
  network?: SocketInfo;
  version?: string;
  command?: string;
  success: boolean;
}

/**
 * RabbitMQ 步骤
 * @author William Chan <root@williamchan.me>
 */
export default class RabbitMQController extends SingleController<RabbitMQControllerData> {
  private content?: string | Buffer;
  private readonly server!: RabbitMQDataSource;
  private readonly result: ResultOptions = {
    success: false,
  };

  /**
   * @inheritdoc
   */
  public constructor(data: RabbitMQControllerData, context: Context, extra?: ControllerExtraConfig) {
    super(data, context, extra);
    this.content = this.data.content;

    // get env data source config
    const server = getDataSourceByServer(this.data.serverId, this.context.env.dataSource);
    if (server && server.type === DATA_SOURCE_TYPE.RABBITMQ) {
      this.server = server;
    } else {
      this.setError(new SystemError(`RabbitMQ Configuration ${this.data.serverId} not found.`));
    }
  }

  private getContent(): string {
    return this.variable.replace(this.content);
  }

  /**
   * create pre script context & method
   * @returns {PreContext}
   */
  protected createPreVMContext(): PreContext {
    const vmContext = Object.create(null) as PreContext;
    vmContext.pre = Object.create(null);
    vmContext.pre.getContent = () => this.getContent();
    vmContext.pre.setContent = (content: string | Buffer) => {
      this.content = content;
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
    vmContext.post.getResultAsBuffer = () => this.result.raw;
    vmContext.post.getResultAsString = () => {
      if (this.data.mode === 0) return this.result.result;
    };
    vmContext.post.getResultAsJSON = () => {
      if (this.data.mode === 0 && typeof this.result.result === 'string') {
        try {
          return JSON.parse(this.result.result);
        } catch (e) {}
      }
    };
    vmContext.post.getResultProperties = () => this.result.properties;
    return vmContext;
  }

  /**
   * @inheritdoc
   */
  protected async execute(): Promise<boolean> {
    let channel!: Channel;
    try {
      const instance = await getPool(this.server);
      const conn = instance.instance;
      this.result.version = instance.version;
      channel = await conn.createChannel();
      if (this.data.mode === 0) { // query
        // 没有配置交换机
        if (!this.data.exchangeName && this.data.queue) {
          await channel.assertQueue(this.data.queue, { durable: false });
          const data = await channel.get(this.data.queue, { noAck: true });
          this.responseHandler(data);
        } else if (this.data.exchangeName) {
          await channel.assertExchange(this.data.exchangeName, this.data.exchangeType || 'direct', { durable: false });
          // 配置了队列名称
          if (this.data.queue) {
            await channel.bindQueue(this.data.queue, this.data.exchangeName, this.data.routingKey || '');
          } else {
            const queue = await channel.assertQueue('', { durable: false });
            await channel.bindQueue(queue.queue, this.data.exchangeName, this.data.routingKey || '');
          }
          const data = await channel.get(this.data.exchangeName, { noAck: true });
          this.responseHandler(data);
        } else {
          throw new Error('Queue or ExchangeName is required.');
        }
      } else { // publish
        const content = this.getContent();
        // 配置了交换机
        if (this.data.exchangeName) {
          await channel.assertExchange(this.data.exchangeName, this.data.exchangeType || 'direct', { durable: false });
          this.result.success = channel.publish(this.data.exchangeName, this.data.routingKey || '', Buffer.from(content));
        } else if (this.data.queue) {
          await channel.assertQueue(this.data.queue, { durable: false });
          this.result.success = channel.sendToQueue(this.data.queue, Buffer.from(content));
        } else {
          throw new Error('Queue or ExchangeName is required.');
        }
        this.result.content = content;
      }
      this.variable.setLocal('RESULT_SUCCESS', this.result.success);
      // @ts-ignore
      this.result.network = getSocketInfo(channel?.connection?.stream);
    } catch (e) {
      throw new ExecuteError(e);
    } finally {
      if (channel) channel.close();
    }
    return true;
  }

  private responseHandler(data: false | GetMessage): void {
    if (data !== false) {
      this.result.success = true;
      this.result.raw = data.content;
      this.result.properties = data.properties;
      this.result.result = data.content.toString('utf-8');
      this.variable.setLocal('RESULT_DATA', this.result.result);
      this.variable.setLocal('RESULT_PROPERTIES_DATA', this.result.result);
    } else {
      this.result.success = false;
    }
  }

  //  -------------------------------- 结果相关 --------------------------------

  /**
   * @inheritdoc
   */
  public async getExtraResult(): Promise<RabbitMQExtraResult> {
    const options = this.server || {};
    return {
      user: options.user,
      host: options.host,
      port: options.port,
      network: this.result.network,
      version: this.result.version,
      serverId: this.data.serverId,
      serverName: this.server?.serverName,
      mode: this.data.mode,
      exchangeName: this.data.exchangeName,
      exchangeType: this.data.exchangeType,
      queue: this.data.queue,
      routingKey: this.data.routingKey,
    };
  }

  /**
   * @inheritdoc
   */
  public async getDetailResult(): Promise<RabbitMQDetailResult> {
    const base = await super.getDetailResult();
    return {
      ...base,
      /** 发送的数据 */
      content: this.getContent(),
      /** 返回的消息 预处理和 hexview 用 */
      raw: this.result.raw,
      /** 消息转换后的内容（可能是错的） 对应 RESULT_DATA 变量 发送模式则是一个布尔值 */
      result: this.result.result,
      /** properties */
      properties: this.result.properties,
      /** 是否查询到 / 发送是否成功 */
      success: this.result.success,
    };
  }

  /**
   * Create Init Result
   * @param base
   * @param data
   * @returns {RabbitMQResult}
   */
  public static createInitResult(base: BaseResult, data: RabbitMQControllerData): RabbitMQResult {
    const result: RabbitMQResult = {
      ...base,
      type: CONTROLLER_TYPE.POSTGRESQL,
      extra: {
        serverId: data.serverId,
        mode: data.mode,
        exchangeName: data.exchangeName,
        exchangeType: data.exchangeType,
        queue: data.queue,
        routingKey: data.routingKey,
      },
    };
    return result;
  }
}
