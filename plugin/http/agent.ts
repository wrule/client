/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import http from 'node:http';
import https from 'node:https';
import http2 from 'http2-wrapper';

// Got12 支持 HTTP2原生模块（当然建议nodejs环境必须v16以上）
// 但是 Got12 不支持 CommonJS 此项目目前还需要依赖 CommonJS 模块
// 而且 Got的升级必须修改 作者是个追新强迫症 也不考虑其他编码 这也是 Postman 至今不支持GBK的原因

const MAX_TIMEOUT = 120 * 1000;

// 不销毁 随着进程死亡而销毁
export const httpAgent = new http.Agent({
  keepAlive: true,
  timeout: MAX_TIMEOUT,
});
export const httpsAgent = new https.Agent({
  keepAlive: true,
  minVersion: 'TLSv1',
  timeout: MAX_TIMEOUT,
});
export const http2Agent = new http2.Agent({
  timeout: MAX_TIMEOUT,
});
