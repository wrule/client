/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { Method } from 'got';
import { HTTPParamsData, HTTPConfig } from '@plugin/http/types/data';
import { BaseResult } from '@engine/core/types/result';
import { SingleControllerDetailResult } from '@engine/core/types/result/single';
import { CONTROLLER_TYPE } from '@engine/core/enum';
import { SocketInfo } from '@engine/utils/socket';

export interface HTTPExtraResult {
  serverId?: string;
  protocol?: string;
  method: Method;
  statusCode?: number;
  /** 3xx 跳转的URL 只可能是 0 或者 > 1 */
  redirects?: string[];
  /** 真实重试的次数 */
  retryCount?: number;
  /** 端口可能为空或空字符串 */
  port?: string;
  hostname?: string;
  path: string;
  /**
   * 这个地方前端需要自己兼容一下，因为可能还没解析到，所以会是 HTTPParamsData[]
   * 如果一旦解析了（执行了），就会是string，string是经过urlencode的
   * 编码方式参考了 RFC 3986 RFC 5987 做了折中处理 前端根据此方法做一下解析
   * url => encodeURIComponent(url).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16)}`);
   */
  params?: string | HTTPParamsData[];
  timings?: {
    wait?: number; // timings.socket - timings.start
    dns?: number; // timings.lookup - timings.socket
    tcp?: number; // timings.connect - timings.lookup
    tls?: number; // timings.secureConnect - timings.connect
    request?: number; // timings.upload - (timings.secureConnect || timings.connect)
    firstByte?: number; // timings.response - timings.upload
    download?: number; // timings.end - timings.response
    total?: number; // (timings.end || timings.error || timings.abort) - timings.start
  };
  /** http version, e.g 1.0 | 1.1 | 2.0 | 3/QUIC */
  version?: string;
  network?: SocketInfo;
  config?: HTTPConfig;
  trace?: string;
}

interface HTTPHeadersResult {
  [key: string]: string | string[] | undefined;
}

export interface HTTPDetailResult extends SingleControllerDetailResult {
  request: {
    headers: HTTPHeadersResult;
    body: Buffer;
  };
  response?: {
    headers: HTTPHeadersResult;
    body: Buffer;
  };
}

// export type HTTPResult = MergeResult<HTTPExtraResult, HTTPDetailResult>
export interface HTTPResult extends BaseResult<HTTPExtraResult> {
  type: CONTROLLER_TYPE.HTTP;
}
