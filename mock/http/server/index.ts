/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { HTTPRules, Rules, HTTPMockConfig } from '@mock/http/types';
import Application from '@mock/http/application';
import Logger from '@/logger';
import http from 'node:http';
import { ResponseData } from '@mock/http/types/server';
import URLManager from '@plugin/http/utils/params-manager/url';
import { getRequest } from '@mock/http/server/utils';
import MockControl from '@mock/http/server/control';
import { ENGINE_VERSION } from '@engine/utils';

/**
 * HTTP Mock Server
 */
export default class HTTPMockServer {
  public control!: MockControl;
  private server!: http.Server;
  private application: Record<string, Application> = {};

  /**
   * create a mock server
   * @param config
   * @returns
   */
  public static async create(config: HTTPMockConfig): Promise<HTTPMockServer> {
    const port = config.port;
    const host = config.host;
    return new Promise((resolve, reject) => {
      const server = new HTTPMockServer(config.rules);
      try {
        server.server.listen({ port, host }, () => {
          resolve(server);
        });
        server.server.on('error', (err: any) => {
          Logger.error(err.message);
          Logger.error('server exit.');
          process.exit(1);
        });
      } catch (e) {
        Logger.error(e.message);
        Logger.error('server exit.');
        process.exit(1);
      }
    });
  }

  /**
   * constructor
   * @param server
   * @param rules
   */
  public constructor(rules: Rules) {
    this.server = http.createServer();
    this.server.keepAliveTimeout = 0;
    this.control = new MockControl(this);
    this.server.on('request', (req, res) => {
      this.handler(req, res);
    });
    Object.keys(rules).forEach((appid) => {
      const rule = rules[appid];
      this.createApplication(appid, rule);
    });
  }

  /**
   * mock request handler
   * @param appId application id
   * @param req request
   * @param res response
   * @returns {Promise<ResponseData>}
   */
  private async mock(appId: string, req: http.IncomingMessage, res: http.ServerResponse): Promise<ResponseData> {
    const application = this.application[appId];
    if (application && req.method && req.url) {
      const method = req.method.toLowerCase();
      const routeResult = application.lookup(method, req.url.split('?')[0]);
      if (routeResult) {
        const url = new URLManager(`http://${req.headers.host}${req.url}`);
        url.port = req.socket.localPort;
        const request = await getRequest(req, res, url, method, routeResult);
        const response = await routeResult.route.handler(request, res);
        return response;
      }
    }
    return {
      statusCode: 404,
      body: {
        code: 404,
        message: 'Mock Route Not Found',
      },
    };
  }

  /**
   * http request handler
   * @param req request
   * @param res response
   * @returns {Promise<void>}
   */
  private async handler(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    try {
      if (req.method && req.url) {
        const paths = req.url.slice(1).split('/');
        if (paths[0] === 'mock') {
          const response = await this.mock(paths[1], req, res);
          this.response(res, response);
        } else if (paths[0] === 'control') {
          const response = await this.control.handler(req, res);
          this.response(res, response);
        } else {
          this.response(res, { statusCode: 404, body: { code: 404, message: 'Page Not Found' } });
        }
      } else {
        res.end();
      }
    } catch (e) {
      Logger.error(e.message);
      Logger.debug(e);
      this.response(res, { statusCode: 500, body: { code: 500, message: e.message } });
    }
  }

  /**
   * http response handler
   * @param res response
   * @param data response data
   */
  private response(res: http.ServerResponse, data: ResponseData): void {
    res.setHeader('Server', `XEngine/MockServer/${ENGINE_VERSION}`);
    // 设置header
    if (data.headers) {
      data.headers.forEach((item) => {
        res.setHeader(item.key, item.value);
      });
    }
    // 状态码
    if (data.statusCode) res.statusCode = data.statusCode;
    // contentType
    if (data.contentType) res.setHeader('Content-Type', data.contentType);
    if (typeof data.body === 'object' && !Buffer.isBuffer(data.body)) {
      if (!data.contentType) {
        res.setHeader('Content-Type', 'application/json');
      }
      res.end(JSON.stringify(data.body));
    } else {
      res.end(data.body);
    }
  }

  /**
   * get all application config
   * @returns {Record<string, HTTPRules>}
   */
  public getAllApplication(): Record<string, Application> {
    return this.application;
  }

  /**
   * create application
   * @param appid application id
   * @param rule application config
   * @returns {Application}
   */
  public createApplication(appid: string, rule: HTTPRules): Application {
    const application = new Application(appid, rule);
    this.application[appid] = application;
    return application;
  }

  /**
   * get application config
   * @param appid application id
   * @returns {Application}
   */
  public getApplication(appid: string): Application {
    return this.application[appid];
  }

  /**
   * delete application
   * @param appid application id
   * @returns {boolean}
   */
  public deleteApplication(appid: string): boolean {
    if (this.application[appid]) {
      delete this.application[appid];
      return true;
    }
    return false;
  }
}
