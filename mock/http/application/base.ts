/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import http from 'node:http';
import cluster from 'node:cluster';
import logger from '@engine/logger';
import Router from '@mock/http/router';
import { HTTPRules, Route } from '@mock/http/types';
import { ResponseData, Request } from '@mock/http/types/server';
import { RouteConfig, RouteResult } from '@mock/http/types/router';
import { DEFAULT_FIELDS_REGEXP, FieldRegExp, createFieldRegExp } from '@mock/utils/fields';

/**
 * 只处理路由事务
 * 后续再抽象一层可以作为其他协议的Base类
 */
export default abstract class ApplicationBase {
  protected appid!: string;
  protected timeout?: number;
  protected fields: FieldRegExp[] = [];
  protected router!: Router;
  protected routes = new Map<string, Route>();
  /** 配置中产生的错误 */
  protected errors: Error[] = [];

  /**
   * 构造函数
   * @param appid
   * @param server
   * @param rule
   */
  public constructor(appid: string, rule: HTTPRules) {
    this.appid = appid;
    this.config(rule);
  }

  /**
   * 配置路由
   * @param rule
   */
  private config(rule: HTTPRules): void {
    this.timeout = rule.timeout;
    // this.cors = rule.cors;
    if (rule.fields) {
      this.fields = Object.values({ ...DEFAULT_FIELDS_REGEXP, ...createFieldRegExp(rule.fields) });
    } else {
      this.fields = Object.values(DEFAULT_FIELDS_REGEXP);
    }
    this.router = new Router();
    const errors: Error[] = [];
    rule.routes.forEach((route) => {
      try {
        this.addRoute(route);
      } catch (e) {
        errors.push(e);
      }
    });
    // 主进程才报错
    if (errors.length && cluster.isPrimary) {
      errors.forEach((e) => {
        logger.warn(`[mock-route] ${this.appid} - ${e.message}`);
      });
    }
    this.errors = errors;
  }

  /**
   * 注册单个路由
   * @param route
   */
  private addRoute(route: Route, change = false): void {
    const path = `/mock/${this.appid}/${route.path}`.replaceAll('//', '/');
    const config: RouteConfig = {
      ...route,
      path,
      id: route.id,
      handler: async (request, res) => {
        const ret = await this.handler(request, res, route);
        return ret;
      },
    };
    if (change) {
      this.router.change(route.id, config);
    } else {
      this.router.add(config);
    }
    this.routes.set(route.id, route);
  }

  /**
   * 获取配置规则
   * @returns {HTTPRules}
   */
  public getRule(): HTTPRules {
    const routes: Route[] = [];
    this.routes.forEach((route) => {
      routes.push(route);
    });
    return {
      timeout: this.timeout,
      fields: this.fields.map((item) => ({
        type: item.type,
        ignoreCase: item.ignoreCase,
        pattern: item.pattern.source,
        mock: item.mock,
      })),
      routes,
    };
  }

  /**
   * 获取一条路由
   * @param id
   * @returns {Route}
   */
  public getRoute(id: string): Route | undefined {
    return this.routes.get(id);
  }

  /**
   * 设置路由
   * @param id
   * @returns {boolean}
   */
  public setRoute(id: string, route: Route): boolean {
    this.addRoute(route, true);
    return true;
  }

  /**
   * 删除一条路由
   * @param id
   * @returns {boolean}
   */
  public deleteRoute(id: string): boolean {
    const route = this.routes.get(id);
    if (route) {
      this.router.remove(id);
      this.routes.delete(id);
      return true;
    }
    return false;
  }

  /**
   * 获取最近一次配置错误
   * @returns {Error[]}
   */
  public getError(): string[] {
    return this.errors.map((e) => e.message);
  }

  /**
   * 通过路径查询路由
   * @param method
   * @param path
   * @param vhost
   * @returns {RouteResult}
   */
  public lookup(method: string, path: string, vhost?: string): RouteResult | undefined {
    return this.router.lookup(method, path, vhost);
  }

  /**
   * 需要实现的处理过程
   * @param req
   * @param res
   */
  public abstract handler(request: Request, res: http.ServerResponse, config: Route): Promise<ResponseData>;
}
