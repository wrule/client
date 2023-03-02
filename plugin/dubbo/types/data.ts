/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */

import { CONTROLLER_TYPE, DATA_SOURCE_TYPE } from '@engine/core/enum';
import { SingleControllerData } from '@engine/core/types/data';
import { DataSource } from '@engine/dispatch/types/data-source';
import { JavaJSONSchema } from '@plugin/dubbo/utils';

export interface DubboParams {
  ['$class']: string;
  ['$data']: any;
}

export interface DubboControllerData extends SingleControllerData {
  type: CONTROLLER_TYPE.DUBBO;
  interface: string;
  method: string;
  version?: string;
  group?: string;
  /** 注册中心 */
  serverId: string;
  /** 比较特别 一会解释 */
  params?: DubboParams[];
  jsonSchema?: JavaJSONSchema;
  body?: unknown;
  config?: {
    isDubbox?: boolean;
    /** 泛化 产品上默认可以打钩 */
    isGeneric?: boolean;
    timeout?: number;
  };
}

export interface ZooKeeperDataSource extends DataSource {
  readonly type: DATA_SOURCE_TYPE.ZOOKEEPER;
}
