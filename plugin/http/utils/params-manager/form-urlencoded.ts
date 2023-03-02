/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import URLSearchParamsManager from '@plugin/http/utils/params-manager/search';

export default class FormUrlencodedManager extends URLSearchParamsManager {
  /**
   * Raw Format
   * key: value
   * @returns {string}
   */
  public toString(encoding = 'utf-8', trim = false): string {
    return super.toString(encoding, trim);
  }
}
