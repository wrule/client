/**
 * This file is part of the hapi-router
 * @author William Chan <root@williamchan.me>
 */
import http from 'node:http';
import { Request, ResponseData } from '@mock/http/types/server';

export interface PathTokens {
  [0]: number;
  [1]: string;
}

export interface RouteConfig {
  method: string;
  path: string;
  vhost?: string;
  id: string;
  handler: (request: Request, res: http.ServerResponse) => Promise<ResponseData>;
}

export interface Route extends RouteConfig {
  tokens: PathTokens[];
}

export interface RouteResult {
  method: string;
  route: Route;
  path: string;
  params?: Record<string, string>;
}
