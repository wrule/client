/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import http from 'node:http';
import URLManager from '@plugin/http/utils/params-manager/url';
import { RouteResult } from '@mock/http/types/router';
import { ResponseHeaders } from '@mock/http/types';

export interface Request {
  url: URLManager;
  method: string;
  headers: http.IncomingHttpHeaders;
  req: http.IncomingMessage;
  route: RouteResult;
  params: Record<string, string>;
  // payload: Record<string, unknown> | string | Buffer;
  form?: Record<string, any>;
  body?: unknown;
  rawBody: Buffer;
}

// 理论上需要抽象一层 算了 暂时懒人
export interface ResponseData {
  body: string | Buffer | object;
  headers?: ResponseHeaders[];
  timeout?: number;
  statusCode?: number;
  contentType?: string;
}
