/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { SingleControllerData } from '@engine/core/types/data';
import { CONTROLLER_TYPE } from '@engine/core/enum';

export interface TCPConfig {
  /**
   * 发送请求与接收响应超时（不是连接超时）
   * @default 5000
   */
  timeout?: number;
  /**
   * 拒绝不受信任的证书
   * @default true
   */
  rejectUnauthorized?: boolean;
}

export interface TCPControllerOptions {
  port?: number | string;
  host?: string;
  tls?: boolean;
  checkEOF?: string;
  encode?: string;
  decode?: string;
}

export interface TCPControllerData extends TCPControllerOptions, SingleControllerData {
  type: CONTROLLER_TYPE.TCP;
  /** 请求参数 */
  data: string;

  /** 使用的服务器名称 */
  serverId?: string;
  // 配置
  config?: TCPConfig;
}
