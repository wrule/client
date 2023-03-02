/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import BaseParamsManager, { Data } from '@plugin/http/utils/params-manager/base';
import { HTTPParamsData } from '@plugin/http/types/data';
import { urlEncodeFromEncoding, urlDecodeFromEncode } from '@plugin/http/utils';
import VariableManager from '@engine/variable';
// encode
// var string = encodeURIComponent(this.string).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16)}`);
// this.string = string.replace(/%20/g, '+'));

// decode
// this.string = decodeURIComponent(this.string.replace(/\+/g, ' '));

/**
 * URLSearchParamsManager
 * 每个规范都实现的不一样
 * 这里明确输入的字符不允许 encode 否则 + 分不清楚
 * urlencode('+ ') => %2B+
 */
export default class URLSearchParamsManager extends BaseParamsManager {
  /**
   * 构造函数
   * @param headers
   * @param variable
   */
  public constructor(params?: HTTPParamsData[] | VariableManager | string, variable?: VariableManager) {
    if (params instanceof VariableManager) {
      super(params);
    } else {
      super(variable);
      if (params) {
        this.setParams(params);
      }
    }
  }

  /**
   * set params 会清空内容
   * @param params
   */
  public setParams(params?: HTTPParamsData[] | string): void {
    this.clear();
    if (params) {
      if (Array.isArray(params)) {
        params.forEach((item) => {
          this.append(item.key, item.value);
        });
      } else {
        let str = params.trimStart();
        if (str[0] === '?') str = str.slice(1);
        str.split('&').forEach((key) => {
          if (key) {
            const item = key.split('=');
            this.append(item[0] || '', item[1] || '');
          }
        });
      }
    }
  }

  /**
   * Raw Format
   * key: value
   * @returns {string}
   */
  public toString(encoding = 'utf-8', trim = true): string {
    const data: string[] = [];
    // eslint-disable-next-line no-restricted-syntax
    for (const [key, value] of this.entries()) {
      if (trim) {
        data.push(`${urlEncodeFromEncoding(key, encoding).trim()}=${urlEncodeFromEncoding(value, encoding).trim()}`);
      } else {
        data.push(`${urlEncodeFromEncoding(key, encoding)}=${urlEncodeFromEncoding(value, encoding)}`);
      }
    }

    return data.join('&');
  }

  /**
   * 获取kv结构
   * @param charset
   * @returns
   */
  public decode(charset = 'utf-8'): Data {
    const data: Data = {};
    // eslint-disable-next-line no-restricted-syntax
    for (const key of this.keys()) {
      const dat = charset ? this.getAll(key).map((value) => urlDecodeFromEncode(value, charset)) : this.getAll(key);
      if (dat.length === 1) {
        data[key] = dat[0];
      }
    }
    return data;
  }
}
