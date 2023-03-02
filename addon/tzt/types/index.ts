/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { BaseServer, SERVER_TYPE } from '@engine/dispatch/types/server';

export interface TZTServer extends BaseServer {
  readonly type: SERVER_TYPE.TZT;
  /** 端口是必填项 TZT不清楚默认端口是多少 */
  readonly port: string;
}
