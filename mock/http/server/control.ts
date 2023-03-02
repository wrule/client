/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import yaml from 'yaml';
import cluster, { Worker } from 'node:cluster';
import http from 'node:http';
import v8 from 'node:v8';
import fs from 'node:fs/promises';
import logger from '@engine/logger';
import URLManager from '@plugin/http/utils/params-manager/url';
import MockServer from '@mock/http/server';
import Router from '@mock/http/router';
import { ResponseData } from '@mock/http/types/server';
import { getRequest } from '@mock/http/server/utils';
import { HTTPRules, Route, Rules } from '@mock/http/types';
import { createVariables, RequestVariables } from '@mock/http/utils';
import { MockConfig } from '@mock/types';
import { ENGINE_VERSION } from '@engine/utils';

interface Action {
  action: number;
  variables: RequestVariables;
}

/**
 * MockControl
 * 支持在线刷新规则
 */
export default class MockControl {
  private server!: MockServer;
  private router!: Router;

  /**
   * 构造函数
   * @param {MockServer} server
   */
  public constructor(server: MockServer) {
    this.server = server;
    this.router = new Router();
    const routes = [
      { path: '/control/application/{appId}', method: 'GET', handler: this.getApplication },
      { path: '/control/application/{appId}', method: 'POST', handler: this.setApplication },
      { path: '/control/application/{appId}', method: 'DELETE', handler: this.deleteApplication },
      { path: '/control/application/{appId}/rule/{routeId}', method: 'GET', handler: this.getApplicationRoute },
      { path: '/control/application/{appId}/rule/{routeId}', method: 'POST', handler: this.setApplicationRoute },
      { path: '/control/application/{appId}/rule/{routeId}', method: 'DELETE', handler: this.deleteApplicationRoute },
      { path: '/control/debug/save', method: 'CHECKOUT', handler: this.save },
    ];
    // register routes
    routes.forEach((route, index) => {
      this.router.add({ ...route,
        id: `#${index}`,
        handler: async (request, res) => {
          // Disable config server in worker thread
          if (request.method.toLowerCase() !== 'get' && cluster.isWorker) {
            return { statusCode: 405, body: { code: 405, message: 'Method Not Allowed' } };
          }
          const variables = createVariables(request);
          const response = await route.handler(variables);
          if (cluster.isPrimary && cluster.workers) {
            const workers = cluster.workers;
            Object.keys(workers).forEach((id) => {
              workers[id]?.send(v8.serialize({
                action: index,
                variables,
              } as Action));
            });
          }
          return response;
        } });
    });
    // register worker refresh message
    if (cluster.isWorker) {
      process.on('message', async (buffer: Buffer) => {
        try {
          const data = v8.deserialize(Buffer.from(buffer)) as Action;
          await routes[data.action].handler(data.variables);
          logger.debug('[mock - control] config sync success');
        } catch (e) {
          logger.error(`[mock - control] ${e.message}`);
        }
      });
    }
  }

  /**
   * 刷新 worker 规则
   * @param {Worker} worker
   */
  public refresh(worker: Worker): void {
    if (cluster.isPrimary) {
      const apps = this.server.getAllApplication();
      Object.keys(apps).forEach((appId) => {
        const app = apps[appId];
        const buffer = v8.serialize({
          action: 1,
          variables: {
            path: { appId },
            body: app.getRule(),
          },
        });
        worker.send(buffer);
      });
    }
  }

  /**
   * handler
   * @param req
   * @param res
   * @returns {Promise<ResponseData>}
   */
  public async handler(req: http.IncomingMessage, res: http.ServerResponse): Promise<ResponseData> {
    if (req.method && req.url) {
      const method = req.method.toLowerCase();
      const routeResult = this.router.lookup(method, req.url);
      if (routeResult) {
        const url = new URLManager(`http://${req.headers.host}${req.url}`);
        url.port = req.socket.localPort;
        const request = await getRequest(req, res, url, method, routeResult);
        const response = await routeResult.route.handler(request, res);
        return response;
      }
    }
    return { statusCode: 404, body: { code: 404, message: 'Control Route Not Found' } };
  }

  /**
   * 获取应用
   * @param request
   * @returns {Promise<ResponseData>}
   */
  private getApplication = async (request: RequestVariables): Promise<ResponseData> => {
    const appId = request.path.appId;
    if (appId) {
      const application = this.server.getApplication(appId);
      if (application) {
        return { body: { code: 200, data: application.getRule(), errors: application.getError() } };
      }
    }
    return { statusCode: 404, body: { code: 404, message: 'Application Not Found' } };
  };

  /**
   * 设置应用
   * @param request
   * @returns {Promise<ResponseData>}
   */
  private setApplication = async (request: RequestVariables): Promise<ResponseData> => {
    const appId = request.path.appId;
    if (appId) {
      const data = request.body as HTTPRules;
      logger.debug(`[mock - control] set application ${appId}, rule length = ${data.routes.length}`);
      const application = this.server.createApplication(appId, data);
      return { body: { code: 200, data: application.getRule(), errors: application.getError() } };
    }
    return { statusCode: 404, body: { code: 404, message: 'Application Not Found' } };
  };

  /**
   * 删除应用
   * @param request
   * @returns {Promise<ResponseData>}
   */
  private deleteApplication = async (request: RequestVariables): Promise<ResponseData> => {
    const appId = request.path.appId;
    if (appId) {
      logger.debug(`[mock - control] delete application ${appId}`);
      return { body: { code: 200, data: this.server.deleteApplication(appId) } };
    }
    return { statusCode: 404, body: { code: 404, message: 'Application Not Found' } };
  };

  /* -------------------------------------------- 设置路由 -------------------------------------------- */

  /**
   * 获取路由
   * @param request
   * @returns {Promise<ResponseData>}
   */
  private getApplicationRoute = async (request: RequestVariables): Promise<ResponseData> => {
    const appId = request.path.appId;
    const routeId = request.path.routeId;
    if (appId && routeId) {
      const application = this.server.getApplication(appId);
      if (application) {
        const route = application.getRoute(routeId);
        if (route) return { body: { code: 200, data: route } };
      }
    }
    return { statusCode: 404, body: { code: 404, message: 'Rule Not Found' } };
  };

  /**
   * 设置路由
   * @param request
   * @returns {Promise<ResponseData>}
   */
  private setApplicationRoute = async (request: RequestVariables): Promise<ResponseData> => {
    const appId = request.path.appId;
    const routeId = request.path.routeId;
    if (appId && routeId && request.body && typeof request.body === 'object') {
      const application = this.server.getApplication(appId);
      const data = request.body as Route;
      if (application) {
        return { body: { code: 200, data: application.setRoute(routeId, data) } };
      }
    }
    return { statusCode: 404, body: { code: 404, message: 'Rule Not Found' } };
  };

  /**
   * 删除路由
   * @param request
   * @returns {Promise<ResponseData>}
   */
  private deleteApplicationRoute = async (request: RequestVariables): Promise<ResponseData> => {
    const appId = request.path.appId;
    const routeId = request.path.routeId;
    if (appId && routeId) {
      const application = this.server.getApplication(appId);
      if (application) {
        return { body: { code: 200, data: application.deleteRoute(routeId) } };
      }
    }
    return { statusCode: 404, body: { code: 404, message: 'Rule Not Found' } };
  };

  /* -------------------------------------------- DEBUG -------------------------------------------- */

  /**
   * save yaml file
   * @param request
   */
  private save = async (request: RequestVariables): Promise<ResponseData> => {
    const application = this.server.getAllApplication();
    const rules: Rules = {};
    Object.keys(application).forEach((appId) => {
      rules[appId] = application[appId].getRule();
    });
    const config = {
      control: { port: 3001, host: '127.0.0.1' },
      http: { port: 3000, host: '0.0.0.0', rules },
    } as MockConfig;
    try {
      await fs.writeFile('./mock-config.yaml', `# -----------------------------------------------------------
# THIS FILE IS AUTOMATICALLY GENERATED
# THIS IS THE MOCK CONFIGURATION GENERATED FOR DEBUGGING PURPOSES ONLY
#
# Engine Version: ${ENGINE_VERSION}
# Date: ${new Date().toString()}
# -----------------------------------------------------------

${yaml.stringify(config)}`);
      return { body: { code: 200, data: 'save success' } };
    } catch (e) {
      return { statusCode: 500, body: { code: 500, message: e.message } };
    }
  };
}
