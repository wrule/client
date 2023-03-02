/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { TCPConfig } from '@plugin/tcp/types/data';
import { BaseResult } from '@engine/core/types/result';
import { SingleControllerDetailResult } from '@engine/core/types/result/single';
import { CONTROLLER_TYPE } from '@engine/core/enum';
import { SocketInfo } from '@engine/utils/socket';
import { ConsoleData } from '@engine/vm/console';
import { ContentType } from '@engine/utils/serialize/type';

export interface TCPExtraResult {
  serverId?: string;
  serverName?: string;
  port?: number | string;
  host?: string;
  tls?: boolean;
  network?: SocketInfo;
  config?: TCPConfig;
}

export interface ScriptResult {
  script: string;
  totalTime: number;
  logs: ConsoleData[];
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

export interface TCPDetailResult extends SingleControllerDetailResult {
  /** 因为检查可能是触发多次的 */
  checkEOF: ScriptResult[];
  encode?: ScriptResult;
  decode?: ScriptResult;
  /** 未经处理数据 */
  data: string;
  /** 执行完封装后的内容 前端hex view展示 */
  hexData?: Buffer;
  /** 结果数据 已处理（类型看用户脚本中怎么输出，可能是任意类型，前端需要自己判断，展示不同的内容框） */
  result?: ContentType;
  /** 执行 decode 之前的数据 */
  hexResult?: Buffer;
}

// export type HTTPResult = MergeResult<HTTPExtraResult, HTTPDetailResult>
export interface TCPResult extends BaseResult<TCPExtraResult> {
  type: CONTROLLER_TYPE.TCP;
}
