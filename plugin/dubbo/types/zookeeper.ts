/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { DATA_SOURCE_TYPE } from '@engine/core/enum';
import { DataSource } from '@engine/dispatch/types/data-source';

export interface ZooKeeperConfig {
  group?: string;
}

export interface ZooKeeperDataSource extends DataSource {
  readonly type: DATA_SOURCE_TYPE.ZOOKEEPER;
  readonly config: ZooKeeperConfig;
}
