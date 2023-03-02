/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
/* eslint-disable no-param-reassign */

import URLSearchParamsManager from '@plugin/http/utils/params-manager/search';
import { HTTPParamsData, HTTPPathInfo } from '@plugin/http/types/data';
import { urlEncodeFromEncoding } from '@plugin/http/utils';
import VariableManager, { REPLACE_MODE } from '@engine/variable';

interface URLParams {
  hostname?: string;
  pathname?: string;
  port?: string | number;
  protocol?: string;
  search?: string | HTTPParamsData[];
}

/**
 * URLManager
 */
// export default class URLManager implements URL {
export default class URLManager {
  public searchParams!: URLSearchParamsManager;
  private data = {
    hash: '',
    hostname: '',
    pathname: '',
    port: '',
    protocol: '',
    // password: '',
    // username: '',
  };

  private pathInfo: HTTPPathInfo[] = [];
  private variable?: VariableManager;

  /**
   * 构造函数 允许传递 原始 url base 初始化
   * @param url
   * @param variable
   */
  public constructor(url?: string | URL | URLParams | VariableManager, variable?: VariableManager) {
    let u: string | URL | URLParams | undefined;
    if (url instanceof VariableManager) {
      this.variable = url;
    } else {
      u = url;
      this.variable = variable;
    }
    this.searchParams = new URLSearchParamsManager(this.variable);
    if (u) this.setUrl(u);
  }

  /**
   * set replace path
   * @example
   * [{ key: id, value: 123 }]
   * /api/{id} -> /api/123
   * @param {HTTPPathInfo[]} pathInfo
   */
  public setPathInfo(pathInfo?: HTTPPathInfo[]): void {
    if (Array.isArray(pathInfo)) {
      this.pathInfo = pathInfo;
    } else {
      this.pathInfo = [];
    }
  }

  /**
   * 设置 URL
   * @param url
   */
  private setUrl(url?: string | URL | URLParams): void {
    if (url) {
      if (typeof url === 'string' || url instanceof URL) {
        const u = url instanceof URL ? url : new URL(url);
        this.protocol = u.protocol;
        this.port = u.port;
        this.host = u.host;
        this.hash = u.hash;
        this.pathname = u.pathname;
        this.searchParams.setParams(u.search);
      } else {
        this.protocol = url.protocol;
        this.hostname = url.hostname;
        this.port = url.port;
        this.pathname = url.pathname;
        this.searchParams.setParams(url.search);
      }
    }
  }

  private replace(item: string): string {
    const variable = this.variable;
    if (!variable) return item;
    return variable.replace(item, REPLACE_MODE.STRING);
  }

  public set href(href: string) {
    this.setUrl(href);
  }

  public get href(): string {
    return this.toString();
  }

  public get protocol(): string {
    return `${this.replace(this.data.protocol)}:`;
  }

  public set protocol(protocol: string | undefined) {
    if (protocol === undefined) protocol = '';
    if (protocol[protocol.length - 1] === ':') {
      this.data.protocol = protocol.substring(protocol.length - 1, -1);
    } else {
      this.data.protocol = protocol;
    }
  }

  public set search(params: string | undefined) {
    if (params === undefined) params = '';
    this.searchParams.setParams(params);
  }

  public get search(): string {
    const search = this.searchParams.toString();
    return `${search ? `?${search}` : ''}`;
  }

  private getPathname(encoding = 'utf-8'): string {
    let pathname = this.data.pathname ? this.replace(this.data.pathname) : '/';
    if (this.pathInfo.length) {
      for (let index = this.pathInfo.length - 1; index > -1; index--) {
        const item = this.pathInfo[index];
        const path = `{${item.key}}`;
        if (pathname.indexOf(path) !== -1) {
          let val = this.replace(item.value);
          if (encoding.toLowerCase() !== 'utf-8') {
            val = urlEncodeFromEncoding(val, encoding);
          }
          // 这里把 + 换成安全的 %2B URL不识别
          pathname = pathname.replaceAll(path, val).replace(/\+/g, '%2B');
        }
      }
    }
    return pathname;
  }

  public get pathname(): string {
    return this.getPathname();
  }

  public set pathname(pathname: string | undefined) {
    if (pathname === undefined) pathname = '';
    this.data.pathname = pathname[0] === '/' ? pathname : `/${pathname}`;
  }

  /**
   * hostname not port
   * @example www.baidu.com
   */
  public get hostname(): string {
    return this.replace(this.data.hostname);
  }

  public set hostname(host: string | undefined) {
    if (host === undefined) {
      this.data.hostname = '';
    } else {
      this.data.hostname = host;
    }
  }

  /**
   * host hostname:port
   * @example www.baidu.com:443
   */
  public get host(): string {
    const port = this.port;
    return `${this.hostname}${(port !== '0' && port !== '') ? `:${port}` : ''}`;
  }

  public set host(host: string | undefined) {
    if (host === undefined) {
      this.data.hostname = '';
      this.data.port = '';
    } else {
      const index = host.indexOf(':');
      if (index !== -1) {
        this.data.hostname = host.slice(0, index);
        this.data.port = host.slice(index + 1);
      } else {
        this.data.hostname = host;
      }
    }
  }

  public get port(): string {
    const port = Number(this.replace(this.data.port));
    if (port <= 0 || port > 0xffff) {
      return '0';
    }
    return port.toString();
  }

  public set port(port: string | number | undefined) {
    if (port === undefined) port = '';
    this.data.port = port.toString();
  }

  public get hash(): string {
    return this.data.hash ? this.replace(this.data.hash) : '';
  }

  public set hash(hash: string) {
    if (hash === undefined) hash = '';
    this.data.hash = hash[0] === '#' ? hash : `#${hash}`;
  }

  public toString(encoding = 'utf-8'): string {
    const search = this.searchParams.toString(encoding);
    return `${this.protocol}//${this.host}${this.getPathname(encoding)}${search ? `?${search}` : ''}`;
  }
}
