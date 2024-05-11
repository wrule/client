/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import Got, { Options, Method, RequestError } from 'got';
import crypto from 'node:crypto';
import { CookieJar } from 'tough-cookie';
import Request, { Response } from 'got/dist/source/core';
import { changeContentFromVariables } from '@engine/core/utils';
import {
  FormDataManager,
  FormUrlencodedManager,
  URLManager,
  HeaderManager,
} from '@plugin/http/utils/params-manager';
import { HTTPControllerData, HTTPConfig } from '@plugin/http/types/data';
import { HTTPResult, HTTPExtraResult, HTTPDetailResult } from '@plugin/http/types/result';
import { httpAgent, httpsAgent, http2Agent } from '@plugin/http/agent';
import { getProxyAgent } from '@plugin/http/pool';
import { CONFIG } from '@engine/config';
import { getSocketInfo, SocketInfo } from '@engine/utils/socket';
import SingleController from '@engine/core/single';
import { BaseResult } from '@engine/core/types/result';
import { CONTROLLER_TYPE } from '@engine/core/enum';
import { createTracing } from '@engine/utils/trace';
import { isObject, isNullOrUndefined } from '@engine/utils';
import { Context, ControllerExtraConfig } from '@engine/core/execute';
import { SystemError, ExecuteError, ResponseError } from '@engine/core/error';
import { PreContext, PostContext } from '@engine/core/types/vm';
import iconv from 'iconv-lite';
import { HTTPProxyServer } from '@engine/dispatch/types/server';
import Logger from '@/logger';

interface Delays {
  lookup?: number;
  connect?: number;
  secureConnect?: number;
  socket?: number;
  response?: number;
  send?: number;
  request?: number;
}

interface HTTPInitOptions {
  method: Method;
  url: URLManager;
  headers: HeaderManager;
  encoding: string;
  form?: FormUrlencodedManager;
  formData?: FormDataManager;
  // searchParams?: URLSearchParamsManager;
  body?: unknown;
  // config
  maxRedirects?: number;
  timeout?: number | Delays;
  followRedirect?: boolean;
  methodRewriting?: boolean;
  http2?: boolean;
  rejectUnauthorized?: boolean;
  retry?: number;
  cookieJar?: CookieJar;
  config?: HTTPConfig;
  proxy?: HTTPProxyServer;
}

interface ResultOptions {
  options?: Options;
  request?: Request;
  response?: Response;
  network?: SocketInfo;
  retryCount?: number;
  trace?: string;
}

/**
 * HTTP 步骤
 * @author William Chan <root@williamchan.me>
 */
export default class HTTPController extends SingleController<HTTPControllerData> {
  private readonly options!: HTTPInitOptions;
  private readonly result: ResultOptions = {};

  /**
   * @inheritdoc
   */
  public constructor(data: HTTPControllerData, context: Context, extra?: ControllerExtraConfig) {
    super(data, context, extra);
    /** @todo mock config */

    // ------------------------- 初始化数据 -------------------------
    const headers = new HeaderManager(CONFIG.HTTP_DEFAULT_HEADERS, this.variable);

    let form, body, formData;
    if (this.data.form) {
      form = new FormUrlencodedManager(this.data.form, this.variable);
    }
    if (this.data.body) {
      body = this.data.body;
    }
    if (this.data.formData) {
      formData = new FormDataManager(this.data.formData, this.variable);
    }

    // create url manager
    const url = new URLManager({
      pathname: this.data.path,
      search: this.data.params,
    }, this.variable);
    url.setPathInfo(this.data.pathInfo);
    let proxy: HTTPProxyServer | undefined;

    // append server config
    if (this.data.serverId) {
      const server = this.context.env.httpServer?.find((item) => item.serverId === this.data.serverId);
      if (server) {
        headers.assign(server.headers);
        url.hostname = server.hostname;
        url.port = server.port;
        url.protocol = server.protocol;
        if (server.basePath) {
          url.pathname = server.basePath + url.pathname;
        }
        proxy = server.proxy;
      } else {
        this.setError(new SystemError(`HTTP Server Configuration ${this.data.serverId} not found.`));
      }
    } else {
      url.hostname = this.data.hostname;
      url.port = this.data.port;
      url.protocol = this.data.protocol;
    }
    // append headers data
    headers.assign(this.data.headers);
    this.options = {
      url,
      method: this.data.method,
      headers,
      form,
      body,
      formData,
      /** @todo 根据配置是否启用 */
      config: this.data.config,
      encoding: this.data.config?.encoding || 'utf-8',
      proxy: this.data.config?.proxy ? this.data.config?.proxy : proxy,
    };
  }

  /**
   * 获取请求路径 且处理 /api/{id}
   * @returns
   */
  private getPath(): string {
    return this.options.url.pathname;
  }

  private getHostname(): string {
    return this.options.url.hostname;
  }

  private getProtocol(): string {
    return this.options.url.protocol;
  }

  private getPort(): string {
    return this.options.url.port;
  }

  private getURLManager(): URLManager {
    return this.options.url;
  }

  /**
   * create pre script context & method
   * @returns {PreContext}
   */
  protected createPreVMContext(): PreContext {
    const vmContext = Object.create(null) as PreContext;
    vmContext.pre = Object.create(null);
    vmContext.pre.getHeaders = () => this.options.headers;
    vmContext.pre.getFormData = () => {
      if (!this.options.formData) this.options.formData = new FormDataManager(this.variable);
      return this.options.formData;
    };
    vmContext.pre.getForm = () => {
      if (!this.options.form) this.options.form = new FormUrlencodedManager(this.variable);
      return this.options.form;
    };
    vmContext.pre.getParams = () => this.options.url.searchParams;
    vmContext.pre.getBody = () => this.getBody();
    vmContext.pre.setBody = (body: string | Buffer) => {
      this.options.body = body;
    };
    vmContext.pre.getURLManager = () => this.options.url;
    vmContext.pre.getPath = () => this.getPath();
    vmContext.pre.setPath = (path: string) => {
      if (!isNullOrUndefined(path)) this.options.url.pathname = path;
    };
    vmContext.pre.getHostname = () => this.getHostname();
    vmContext.pre.setHostname = (hostname: string) => {
      if (!isNullOrUndefined(hostname)) this.options.url.hostname = hostname;
    };
    vmContext.pre.getProtocol = () => this.getProtocol();
    vmContext.pre.setProtocol = (protocol: string) => {
      if (!isNullOrUndefined(protocol)) this.options.url.protocol = protocol;
    };
    vmContext.pre.getPort = () => this.getPort();
    vmContext.pre.setPort = (port: string | number) => {
      if (!isNullOrUndefined(port)) this.options.url.port = port;
    };
    vmContext.pre.getMethod = () => this.options.method;
    vmContext.pre.setMethod = (method: Method) => {
      if (!isNullOrUndefined(method)) this.options.method = method;
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
    const response = this.result.response;
    if (response) {
      vmContext.post.getBody = (): unknown => response.body;
      vmContext.post.getBodyAsBuffer = (): Buffer => response.rawBody;
      vmContext.post.getBodyAsJSON = (): any => JSON.parse(response.body as string);
      vmContext.post.getHeaders = (): any => response.headers;
      vmContext.post.getStatusCode = (): number => response.statusCode;
      vmContext.post.getStatusMessage = (): string | undefined => response.statusMessage;
      vmContext.post.getTime = (): any => response.timings.phases;
      vmContext.post.getURL = (): string => response.url;
      vmContext.post.getRequestURL = (): string => response.requestUrl;
      vmContext.post.getRequestHeaders = (): any => response.request.options.headers;
      vmContext.post.getRequestMethod = (): any => response.request.options.method;
      vmContext.post.getRequestBody = (): any => response.request.options.body;
      // vmContext.post.getRequestHeaders = (): string => ;
    }
    return vmContext;
  }

  /**
   * 获取BODY 仅针对于BODY字段
   * @param charset
   * @returns {string | Buffer | undefined}
   */
  private getBody(charset = 'utf-8'): string | Buffer | undefined {
    /** @fixme 这里性能可能堪忧 */
    let processedData: unknown;
    if (this.options.headers.isJSON) {
      try {
        if (typeof this.options.body === 'string' || Array.isArray(this.options.body || isObject(this.options.body))) {
          processedData = changeContentFromVariables(
            typeof this.options.body === 'string' ? JSON.parse(this.options.body) : this.options.body,
            this.variable,
          );
        }
      } catch (e) {
        this.log('warn', e.message);
      }
    }
    try {
      let body: string;
      if (processedData) {
        body = JSON.stringify(processedData);
      } else if (typeof this.options.body === 'string') {
        body = this.variable.replace(this.options.body);
      } else {
        body = this.variable.replace(JSON.stringify(this.options.body));
      }
      if (charset.toLowerCase() !== 'utf-8') {
        return iconv.encode(body, this.options.encoding);
      }
      return body;
    } catch (e) {
      this.log('warn', e.message);
    }
  }

  /**
   * 发送前的最后准备
   * @returns {Options}
   */
  private async getOptions(): Promise<Options> {
    const options: Options = {};
    const config = this.data.config || {};
    // const contentType = this.options.headers.getContentType();
    // const charset = this.options.headers.getCharset();
    options.method = this.options.method;
    // url
    const url = this.getURLManager();
    options.url = url.toString(this.options.encoding);

    // console.log(options.url);
    if (this.options.headers.isForm) {
      options.body = this.options.form?.toString(this.options.encoding);
    } else if (this.options.headers.isMultipartForm) {
      if (this.options.formData) {
        options.body = await this.options.formData.toBuffer(this.options.encoding, this.context.files);
        const boundary = this.options.formData.getHeader();
        this.options.headers.setContentType(boundary);
      }
      /** @fixme 没有 boundary 会怎么样? */
    } else if (this.options.body) {
      options.body = this.getBody(this.options.encoding);
    }

    if (this.context.traceState) {
      this.result.trace = createTracing();
      this.options.headers.set('traceparent', this.result.trace);
      this.options.headers.set('tracestate', this.context.traceState);
    }
    options.headers = this.options.headers.toData(this.options.encoding, true);
    // console.log(this.options.headers.toData(this.options.encoding, true));
    // 配置项
    options.maxRedirects = config.maxRedirects !== undefined ? config.maxRedirects : CONFIG.HTTP_DEFAULT_MAX_REDIRECTS;

    const timeout = config.timeout !== undefined ? config.timeout : CONFIG.HTTP_DEFAULT_CONNECT_TIMEOUT;
    options.timeout = {
      lookup: CONFIG.HTTP_DEFAULT_CONNECT_TIMEOUT,
      connect: CONFIG.HTTP_DEFAULT_CONNECT_TIMEOUT,
      secureConnect: CONFIG.HTTP_DEFAULT_CONNECT_TIMEOUT,
      // send: timeout,
      // response: timeout,
      request: timeout,
    };
    options.followRedirect = config.followRedirect !== undefined ? config.followRedirect : CONFIG.HTTP_DEFAULT_FOLLOW_REDIRECT;
    options.methodRewriting = config.methodRewriting !== undefined ? config.methodRewriting : CONFIG.HTTP_DEFAULT_METHOD_REWRITING;

    options.retry = {
      limit: config.retry !== undefined ? config.retry : CONFIG.HTTP_DEFAULT_RETRY,
      errorCodes: [
        // 'ETIMEDOUT',
        'ECONNRESET',
        'EADDRINUSE',
        'ECONNREFUSED',
        'EPIPE',
        'ENOTFOUND',
        'ENETUNREACH',
        'EAI_AGAIN',
      ],
      methods: ['GET', 'PUT', 'HEAD', 'DELETE', 'OPTIONS', 'TRACE', 'POST'],
      calculateDelay: (opt) => {
        if (opt.retryOptions.methods.includes(options.method || 'GET')) {
          const err = opt.error;
          const retry = opt.retryOptions;
          if (
            (err.code && retry.errorCodes.includes(err.code))
            || (err.response && retry.statusCodes.includes(err.response.statusCode))
          ) {
            if (opt.attemptCount <= retry.limit) {
              return 1000;
            }
          }
        }
        return 0;
      },
    };

    /** @notice 如果已有设置 cookie 则不继承 cookie */
    if (!options.headers?.cookie) {
      options.cookieJar = this.context.cookie.cookieJar;
    }
    /** @notice http/2 在 node v15 以上才正式可用 低于这个版本都有问题 */
    if (config.http2) {
      options.http2 = config.http2;
      delete options.headers?.connection;
    }
    // TLS
    if (config.rejectUnauthorized !== undefined) {
      options.https = {
        rejectUnauthorized: config.rejectUnauthorized,
      };
    }

    // internal setting
    if (!this.options.proxy) {
      options.agent = {
        http: httpAgent,
        https: httpsAgent,
        http2: http2Agent,
      };
    } else {
      // inject proxy agent
      const agent = await getProxyAgent(this.options.proxy);
      options.agent = {
        http: agent.instance.http,
        https: agent.instance.https,
        http2: agent.instance.http2,
      };
    }

    options.allowGetBody = true;
    options.hooks = {
      beforeRetry: [
        (opt, err, count) => {
          if (err && count && count <= opt.retry.limit) {
            if (!this.result.retryCount) {
              this.result.retryCount = 0;
            }
            this.result.retryCount++;
            // transform traceState
            if (this.context.traceState) {
              this.result.trace = createTracing();
              // eslint-disable-next-line no-param-reassign
              opt.headers.traceparent = this.result.trace;
              // eslint-disable-next-line no-param-reassign
              opt.headers.tracestate = this.context.traceState;
            }
            return this.log('warn', `${err?.message || ''} retry ${count}/${opt.retry.limit}`);
          }
          throw err;
        },
      ],
    };
    return options;
  }

  /**
   * @inheritdoc
   */
  protected async execute(): Promise<boolean> {
    let httpId = 'http-' + crypto.randomUUID().split('-')[0];
    let totalTime = 0;
    try {
      this.result.options = await this.getOptions();
      const url = this.result.options.url?.toString() ?? '';
      httpId += (url ? `-${url}` : '')
      Logger.info(httpId, 'send');
      totalTime = Date.now();
      const result = await Got(this.result.options) as Response;
      Logger.info(httpId, 'finish', (Date.now() - totalTime) + 'ms');
      await this.responseHandler(result.request, result);
    } catch (e) {
      Logger.info(httpId, 'error', e.message, (Date.now() - totalTime) + 'ms');
      // console.log(e.message);
      await this.responseHandler(e);
    }
    return true;
  }

  /**
   * Response Handler
   * @param request
   * @param response
   */
  private async responseHandler(request: Request | Error, response?: Response): Promise<void>;
  private async responseHandler(request: Request, response: Response): Promise<void> {
    // 请求错误 4xx 5xx
    if (request instanceof RequestError) {
      this.result.request = request.request;
      this.result.response = request.response;
      /** @var request {RequestError}  */
      if (request.request && request.response) {
        // 状态码大于4xx 且没有断言
        if (request.response.statusCode >= 400 && !this.data.assert?.length) {
          throw new ResponseError(request.message);
        }
      } else {
        throw new ExecuteError(request);
      }
    } else if (request instanceof Error) {
      throw new ExecuteError(request);
    } else {
      this.result.request = request;
      this.result.response = response;
    }
    const req = this.result.request;
    const res = this.result.response;
    if (req && res) {
      // response cookies
      this.result.network = getSocketInfo(req.socket);
      // if not use cookieJar, to be set
      if (res && !req.options.cookieJar) {
        const rawCookies = res.headers['set-cookie'];
        if (rawCookies) {
          await Promise.all(rawCookies.map((rawCookie: string) => this.context.cookie.cookieJar.setCookie(rawCookie, res.url)));
        }
      }
      // response encoding
      const resEncoding = HeaderManager.getCharset(res.headers['content-type']);
      if (resEncoding && resEncoding.toLocaleLowerCase() !== 'utf-8') {
        if (resEncoding.toLocaleLowerCase() !== this.options.encoding.toLocaleLowerCase()) {
          this.log('warn', `send encoding is ${this.options.encoding}, response encoding is ${resEncoding}, encoding mismatch, unknown error possible`);
        }
        const body = iconv.decode(res.rawBody, resEncoding);
        res.body = body;
        res.rawBody = Buffer.from(body);
        // console.log(this.result.response?.body);
        // console.log(this.result.response?.rawBody.toString('utf-8'));
      }

      this.variable.setLocal('RESPONSE_BODY', res.body);
      this.variable.setLocal('RESPONSE_HEADER', res.headers);
      this.variable.setLocal('RESPONSE_CODE', res.statusCode);
      // console.log(response.request.options.headers);
    }
  }

  //  -------------------------------- 结果相关 --------------------------------

  /**
   * 获取执行时间
   * @returns {number} totalTime
   */
  public calcTotalTime(): number {
    const total = this.result.response?.timings?.phases.total;
    if (total) {
      return total;
    }
    return this.totalTime;
  }

  /**
   * @inheritdoc
   */
  public async getExtraResult(): Promise<HTTPExtraResult> {
    const url = this.result.request?.options?.url || this.getURLManager();
    const redirects = this.result.request?.redirects;
    const requestUrl = this.result.request?.requestUrl;
    // console.log(requestUrl && redirects && redirects.length > 0 ? [requestUrl, ...redirects] : undefined);
    // console.log(this.result.network?.local);
    return {
      redirects: requestUrl && redirects && redirects.length > 0 ? [requestUrl, ...redirects] : undefined,
      statusCode: this.result.response?.statusCode,
      method: this.result.request?.options?.method || this.options.method,
      protocol: url.protocol[url.protocol.length - 1] === ':' ? url.protocol.slice(0, -1) : url.protocol,
      port: url.port,
      hostname: url.hostname,
      path: url.pathname,
      params: url.search,
      timings: this.result.response?.timings?.phases,
      version: this.result.response?.httpVersion,
      network: this.result.network,
      config: this.data.config,
      serverId: this.data.serverId,
      trace: this.result.trace,
      retryCount: this.result.retryCount,
    };
  }

  /**
   * @inheritdoc
   */
  public async getDetailResult(): Promise<HTTPDetailResult> {
    const base = await super.getDetailResult();
    const options = this.result.request?.options || this.result.options || await this.getOptions();
    let body = Buffer.isBuffer(options.body) || typeof options.body === 'string' ? options.body : '';
    if (this.options.headers.isMultipartForm && this.options.formData) {
      body = this.options.formData.toString();
    }
    const result: HTTPDetailResult = {
      ...base,
      request: {
        body: Buffer.from(body),
        headers: options.headers || {},
      },
    };

    if (this.result.response) {
      result.response = {
        body: this.result.response.rawBody,
        headers: this.result.response.headers,
      };
    }

    return result;
  }

  /**
   * Create Init Result
   * @param base
   * @param data
   * @returns {HTTPResult}
   */
  public static createInitResult(base: BaseResult, data: HTTPControllerData): HTTPResult {
    const result: HTTPResult = {
      ...base,
      type: CONTROLLER_TYPE.HTTP,
      extra: {
        method: data.method,
        serverId: data.serverId,
        path: data.path,
        params: data.params,
        config: data.config,
      },
    };
    return result;
  }
}
