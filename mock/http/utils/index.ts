/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */

import { Request } from '@mock/http/types/server';
import { HeaderManager } from '@plugin/http/utils/params-manager';
import { urlDecodeFromEncode } from '@plugin/http/utils';

export interface RequestVariables {
  headers: Record<string, unknown>;
  params: Record<string, string>;
  path: Record<string, string>;
  form: Record<string, string>;
  formData: Record<string, Buffer>;
  body?: unknown;
  rawBody: Buffer;
}

/**
 * 创建请求变量集
 * @param request
 * @returns
 */
export const createVariables = (request: Request): RequestVariables => {
  // 创建变量集
  const charset = HeaderManager.getCharset(request.headers['content-type']);
  const path: Record<string, string> = {};
  const params = request.route.params || {};
  Object.keys(params).forEach((key) => {
    path[key] = urlDecodeFromEncode(params[key], charset);
  });
  const variables: RequestVariables = {
    path,
    params: request.params,
    headers: request.headers,
    formData: {}, // todo
    form: request.form || {},
    body: request.body,
    rawBody: request.rawBody,
  };
  return variables;
};
