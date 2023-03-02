/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */

import HeaderManager from '@plugin/http/utils/params-manager/header';

/**
 * gRPC Metadata extends HeaderManager
 */
export default class MetadataManager extends HeaderManager {
  /**
   * 是否是空
   * @returns
   */
  public isEmpty(): boolean {
    return Object.keys(this.data).length === 0;
  }
}
