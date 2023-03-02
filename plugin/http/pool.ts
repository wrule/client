/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import BasePool, { InstanceResult } from '@engine/core/pool';
import { HttpProxyAgent, HttpsProxyAgent } from 'hpagent';
import http2 from 'http2-wrapper';
import { HTTPProxyServer } from '@engine/dispatch/types/server';
import { CONFIG } from '@engine/config';

interface HTTPAgent {
  http: HttpProxyAgent;
  https: HttpsProxyAgent;
  http2: http2.Agent;
}

/**
 * HTTPAgentPool 资源池
 * 主要用于 Proxy 的 Agent
 */
class HTTPAgentPool extends BasePool<HTTPAgent> {
  /**
   * 根据 proxy HTTPAgent
   * @param server
   * @returns {Promise<InstanceResult<HTTPAgent>>}
   */
  public async getPool(server: HTTPProxyServer): Promise<InstanceResult<HTTPAgent>> {
    const proxy = new URL(`http://${server.hostname}:${server.port}`);
    if (server.username) proxy.username = server.username;
    if (server.password) proxy.password = server.password;
    // eslint-disable-next-line no-return-await
    return await this.get(proxy.href, proxy);
  }

  /**
   * @inheritdoc
   */
  protected async create(proxy: URL): Promise<InstanceResult<HTTPAgent>> {
    const httpAgent = new HttpProxyAgent({
      timeout: CONFIG.HTTP_DEFAULT_CONNECT_TIMEOUT,
      keepAlive: true,
      keepAliveMsecs: 1000,
      maxSockets: 256,
      maxFreeSockets: 256,
      scheduling: 'lifo',
      proxy,
    });
    const httpsAgent = new HttpsProxyAgent({
      timeout: CONFIG.HTTP_DEFAULT_CONNECT_TIMEOUT,
      rejectUnauthorized: false,
      minVersion: 'TLSv1',
      keepAlive: true,
      keepAliveMsecs: 1000,
      maxSockets: 256,
      maxFreeSockets: 256,
      scheduling: 'lifo',
      proxy,
    });
    const http2Agent = new http2.proxies.Http2OverHttp({
      timeout: CONFIG.HTTP_DEFAULT_CONNECT_TIMEOUT,
      proxyOptions: {
        url: proxy,
      },
    });

    return {
      instance: {
        http: httpAgent,
        https: httpsAgent,
        http2: http2Agent,
      },
    };
  }

  /**
   * @inheritdoc
   */
  protected free(instance: InstanceResult<HTTPAgent>): void {
    instance.instance.http.destroy();
    instance.instance.https.destroy();
    instance.instance.http2.destroy();
  }
}

const pool = new HTTPAgentPool();

export const getProxyAgent = pool.getPool.bind(pool);
