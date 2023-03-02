/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { HTTPHeadersData } from '@plugin/http/types/data';
import { FileData } from '@/utils/file';

export enum SERVER_TYPE {
  TCP = 1,
  UDP = 2,
  /** 从抓包来看 其实也是TCP的一种 修改了部分TCP的特性 所以是TCP2 */
  T2 = 3,
  GRPC = 4,
  TZT = 10000,
}

export interface HTTPProxyServer {
  hostname: string;
  port: number;
  username?: string;
  password?: string;
}

export interface HTTPServer {
  readonly serverId: string;
  readonly hostname: string;
  readonly protocol: string;
  readonly port?: number;
  readonly headers?: HTTPHeadersData[];
  readonly proxy?: HTTPProxyServer;
  readonly basePath?: string;
}

export interface BaseServer {
  readonly serverId: string;
  /** 服务器名字 原样返回给前端 */
  readonly serverName?: string;
  readonly host: string;
  readonly port: string | number;
}

export interface GRPCServer extends BaseServer {
  readonly type: SERVER_TYPE.GRPC;
  readonly proto: FileData[];
  readonly tls?: boolean;
  readonly tlsOptions?: {
    readonly ca?: FileData;
    readonly cert?: FileData;
    readonly key?: FileData;
  };
}

export interface TCPServer extends BaseServer {
  readonly type: SERVER_TYPE.TCP;
  readonly tls?: boolean;
  readonly checkEOFScriptId?: string;
  readonly encodeScriptId?: string;
  readonly decodeScriptId?: string;
}

interface T2CertConfig {
  cert: FileData;
  certPwd?: string;
}

export interface T2Options {
  /** 系统号 */
  systemNo?: number;
  /** 分支机构？ */
  branchNo?: number;
  /** 子系统号 */
  subSystemNo?: number;
  /** 设置公司编号 */
  companyID?: number;
}

export interface T2Server extends BaseServer {
  readonly type: SERVER_TYPE.T2;
  /** 端口是必填项 T2不清楚默认端口是多少 */
  readonly port: number;
  readonly config: {
    /** 使用SSL */
    tls?: T2CertConfig;
    /**
     * 内容编码，会对发送和返回都进行编码解码，默认 UTF-8
     * #define T2_CONTENT_CHARSET_UTF8 0
     * #define T2_CONTENT_CHARSET_GBK 1
     */
    encoding?: number;
    /** license 是必填项 */
    license: T2CertConfig;
  };
  readonly options?: T2Options;
}

export type Server = TCPServer | T2Server | GRPCServer;
