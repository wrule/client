/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */

import { ZooKeeperDataSource } from '@plugin/dubbo/types/zookeeper';
import { getDubboPool } from '@plugin/dubbo/pool';
import { timerExecute } from '@engine/core/utils';

interface QueryZooKeeper {
  path?: string;
  dataSource: ZooKeeperDataSource;
}

interface QueryResult {
  paths: string[];
}

/**
 * Query ZooKeeper
 * @param data
 * @returns {Promise<QueryResult>}
 */
export const queryZooKeeper = async (data: QueryZooKeeper): Promise<QueryResult> => {
  const app = await getDubboPool(data.dataSource);
  const path = data.path ? data.path : '/dubbo';
  // 内部库有问题 后续改库解决
  const paths = await timerExecute(app.instance.app.registry.query(path), 5000, `Connect zookeeper timed out after 5000ms, host = ${data.dataSource.host}:${data.dataSource.port}`);
  return { paths };
};
