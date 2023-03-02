/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import http from 'node:http';
import FormUrlencodedManager from '@plugin/http/utils/params-manager/form-urlencoded';
import MultipartParser from '@mock/http/server/utils/multipart-parser';
import URLManager from '@plugin/http/utils/params-manager/url';
import { Request } from '@mock/http/types/server';
import { RouteResult } from '@mock/http/types/router';
import { HeaderManager } from '@plugin/http/utils/params-manager';

const MAX_BODY_SIZE = 1024 * 1024 * 50;

export const getRequest = async (
  req: http.IncomingMessage,
  res: http.ServerResponse,
  url: URLManager,
  method: string,
  route: RouteResult,
): Promise<Request> => new Promise((resolve, reject) => {
  const contentType = req.headers['content-type'] || '';
  const charset = HeaderManager.getCharset(req.headers['content-type']);
  const request = {
    req,
    route,
    url,
    headers:
    req.headers,
    method,
    params: url.searchParams.decode(charset),
  } as Request;

  let data = Buffer.alloc(0);
  let isMultipart = false;
  req.on('data', (chunk) => {
    if (data.length + chunk.length > MAX_BODY_SIZE) {
      reject(new Error(`body size too large, max: ${MAX_BODY_SIZE}`));
    }
    data = Buffer.concat([data, chunk]);
  });
  req.on('end', () => {
    try {
      if (HeaderManager.isJSON(contentType)) {
        const body = data.toString();
        request.body = JSON.parse(body);
      } else if (HeaderManager.isForm(contentType)) {
        const form = new FormUrlencodedManager(data.toString());
        request.form = form.decode();
      } else if (HeaderManager.isMultipartForm(contentType)) {
        isMultipart = true;
        const boundary = contentType.match(
          /boundary=(?:"([^"]+)"|([^;]+))/i,
        );
        if (boundary && (boundary[1] || boundary[2])) {
          /** @todo 暂时不想处理 */
          const parser = new MultipartParser();
          parser.initWithBoundary(boundary[1] || boundary[2]);
          parser.write(data);
          parser.on('data', ({ name, buffer, start, end }) => {
            if (name === 'end') {
              resolve(request);
            }
          });
          parser.on('error', () => {
            resolve(request);
          });
        }
      } else if (HeaderManager.isXML(contentType)) {
        request.body = data.toString();
      } else if (contentType.includes('text/html')) {
        request.body = data.toString();
      } else if (contentType.includes('application/octet-stream')) {
        request.body = data;
      } else {
        request.body = data.toString();
      }
    } catch (e) {
      request.body = data.toString();
    }
    request.rawBody = data;
    if (!isMultipart) {
      resolve(request);
    }
  });
});
