/**
 * This file is part of the hapi-router
 * @author William Chan <root@williamchan.me>
 */
// import { resolve } from 'node:path';
import Segment, { tokenize, PathType } from '@mock/http/router/segment';
import { Route, RouteConfig, RouteResult } from '@mock/http/types/router';

type RouteMap = Map<string, Segment>

/**
 * 简易路由
 * @author William Chan <root@williamchan.me>
 */
export default class Router {
  // 唯一索引 方便快速找到路由
  private ids = new Map<string, Segment>();
  // 根据vhost分组
  private vhost: Map<string, RouteMap> = new Map();
  // 路由组
  private routes: RouteMap = new Map();

  // private settings: any;

  // public constructor(options: any = {}) {
  //   this.settings = { isCaseSensitive: true, ...options };
  // }

  public add(config: RouteConfig): void {
    if (!this.ids.has(config.id)) {
      const method = config.method.toLowerCase();
      const vhost = config.vhost || '*';
      // const path = resolve(config.path);
      const path = config.path;
      if (vhost !== '*') {
        if (!this.vhost.has(vhost)) {
          this.vhost.set(vhost, new Map());
        }
      }
      const table = vhost === '*' ? this.routes : this.vhost.get(vhost);
      if (table) {
        const route: Route = {
          path: config.path,
          method,
          vhost,
          id: config.id,
          handler: config.handler,
          tokens: tokenize(path),
        };

        if (!table.has(method)) {
          table.set(method, new Segment());
        }
        const map = table.get(method);

        if (map) {
          try {
            const segments = map.create(route.tokens, route);
            this.ids.set(config.id, segments);
          } catch (e) {
            throw new Error(`route#${config.id} ${config.method.toUpperCase()} ${config.path} already exists`);
          }
        }
      }
    } else {
      throw new Error(`route#${config.id} already exists`);
    }
  }

  /**
   * lookup route by path
   * @param method
   * @param path
   * @param vhost
   * @returns
   */
  public lookup(method: string, path: string, vhost?: string): RouteResult | undefined {
    const m = method === 'head' || method === 'options' ? 'get' : method;
    const table = vhost ? this.vhost.get(vhost) : this.routes;
    if (table) {
      const segment = table.get(m);
      if (segment) {
        const route = segment.lookup(path);
        if (route) {
          const params: Record<string, string> = {};
          (path[0] === '/' ? path.substring(1) : path).split('/').forEach((str, index) => {
            const seg = route.tokens[index];
            if (seg[0] === PathType.PARAM) {
              params[seg[1]] = str;
            }
          });
          return {
            method,
            route,
            path,
            params,
          };
        }
      }
    }
  }

  public get(id: string): Segment | undefined {
    return this.ids.get(id);
  }

  public remove(id: string): void {
    const segment = this.get(id);
    if (segment && segment.route) {
      segment.delete();
      this.ids.delete(id);
    }
  }

  public change(id: string, route: RouteConfig): void {
    const segment = this.get(id);
    if (segment && segment.route) {
      const config = segment.route;
      segment.delete();
      this.ids.delete(id);
      try {
        this.add(route);
      } catch (e) {
        this.add(config);
        throw e;
      }
    } else {
      this.add(route);
    }
  }
}

// const a = new Router();

// // a.add({
// //   id: 'a',
// //   method: 'get',
// //   path: '/a',
// //   vhost: '*',
// // });

// // a.add({
// //   id: 'ab',
// //   method: 'post',
// //   path: '/a/{a}',
// //   vhost: '*',
// // });
// // a.add({
// //   id: 'ab',
// //   method: 'post',
// //   path: '/a/aaa',
// //   vhost: '*',
// // });

// // a.add({
// //   id: 'ab',
// //   method: 'post',
// //   path: '/a/{a}',
// //   vhost: '*',
// // });

// // a.add({
// //   id: 'ab',
// //   method: 'post',
// //   path: '/a/{ca}',
// //   vhost: '*',
// // });
// // a.add({
// //   id: 'abc',
// //   method: 'post',
// //   path: '/a/{a}/',
// //   vhost: '*',
// // });
// // a.add({
// //   id: 'ab',
// //   method: 'post',
// //   path: '/{c}/aaa',
// //   vhost: '*',
// // });
// // a.add({
// //   id: 'ab',
// //   method: 'post',
// //   path: '/{c}/aaa/a',
// //   vhost: '*',
// // });

// // a.add({
// //   id: 'ab',
// //   method: 'post',
// //   path: '/a/b/{c}',
// //   vhost: '*',
// // });
// // a.add({
// //   id: 'abc',
// //   method: 'post',
// //   path: '/a/b/{id}',
// //   vhost: '*',
// // });
// // console.log(a.lookup('post', '/a/ccccsd/'));
// // console.log(a.lookup('post', '/a/ccccsd/')?.route.delete());
// // console.log(a.routes.get('post'));

// // console.log(a.routes.get('post'));

// // a.add({
// //   id: 'abc',
// //   method: 'post',
// //   path: '/{a}',
// //   vhost: '*',
// // });

// // a.add({
// //   id: 'abcd',
// //   method: 'post',
// //   path: '/{a}/{b}',
// //   vhost: '*',
// // });
// // a.add({
// //   id: 'ab',
// //   method: 'post',
// //   path: '/{a}/d/c/d/e/f',
// //   vhost: '*',
// // });
// // a.add({
// //   id: 'abdd',
// //   method: 'post',
// //   path: '/a/d/c/d/e/f',
// //   vhost: '*',
// // });
// // console.log(a.get('ab'));

// // console.log(a.get('abc').delete());
// // console.log(a.routes.get('post'));

// // console.log(a.lookup('post', '/bb/aa'));

// // setInterval(() => {

// // }, 50000);
