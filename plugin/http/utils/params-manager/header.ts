/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { Headers as GotHeaders } from 'got';
import BaseParamsManager, { Data } from '@plugin/http/utils/params-manager/base';
import { HTTPHeadersData } from '@plugin/http/types/data';
import VariableManager from '@engine/variable';

// key
export const CONTENT_TYPE = 'content-type';
export const COOKIE = 'cookie';
export const CONTENT_LENGTH = 'content-length';
export const HOST = 'host';
// 常见的格式识别
export const APPLICATION_JSON = 'application/json';
export const APPLICATION_X_WWW_FORM_URLENCODED = 'application/x-www-form-urlencoded';
export const MULTIPART_FORM_DATA = 'multipart/form-data';
export const APPLICATION_XML = 'application/xml';
export const TEXT_XML = 'text/xml';

// case insensitive, only be set once
// RFC 2616 RFC 7540 规定 headers 不区分大小写
// 发送的时候的确也是小写的，这部分代码考虑去掉
// const SPECIAL_FIELDS = {
//   CONTENT_TYPE: true,
//   COOKIE: true,
//   CONTENT_LENGTH: true,
// };

/**
 * HeaderManager
 * @author William Chan <root@williamchan.me>
 */
export default class HeaderManager extends BaseParamsManager {
  /**
   * 构造函数 允许传递 原始 header 初始化
   * @param headers
   * @param variable
   */
  public constructor(headers?: GotHeaders | HTTPHeadersData[] | string | VariableManager, variable?: VariableManager) {
    if (headers instanceof VariableManager) {
      super(headers);
    } else {
      super(variable);
      if (headers) {
        this.appendData(headers);
      }
    }
  }

  /**
   * 根据类型拆解追加
   * @param headers
   */
  private appendData(headers: GotHeaders | HTTPHeadersData[] | string): void {
    if (Array.isArray(headers)) {
      headers.forEach((item) => {
        this.append(item.key, item.value);
      });
    } else if (typeof headers === 'string') {
      headers.split('\n').forEach((str) => {
        const index = str.indexOf(':');
        if (index !== -1) {
          this.append(str.slice(0, index), str.slice(index + 1).trim());
        }
      });
    } else {
      Object.keys(headers).forEach((key) => {
        const item = headers[key];
        if (item) {
          if (Array.isArray(item)) {
            item.forEach((value) => {
              this.append(key, value);
            });
          } else if (this.has(key)) {
            this.append(key, item);
          } else {
            this.set(key, item);
          }
        }
      });
    }
  }

  /**
   * assign
   * @param headers
   */
  public assign(headers: GotHeaders | HTTPHeadersData[] | string = []): void {
    const keys: Record<string, true> = {};
    if (Array.isArray(headers)) {
      headers.forEach((item) => {
        keys[item.key] = true;
      });
    } else if (typeof headers === 'string') {
      headers.split('\n').forEach((str) => {
        const index = str.indexOf(':');
        if (index !== -1) {
          keys[str.slice(0, index)] = true;
        }
      });
    } else {
      Object.keys(headers).forEach((key) => {
        const item = headers[key];
        if (item) {
          keys[key] = true;
        }
      });
    }
    Object.keys(keys).forEach((key) => {
      this.delete(key);
    });
    this.appendData(headers);
  }

  /**
   * get content type
   * @returns {string | undefined}
   */
  public getContentType(): string | undefined {
    const arr = this.getAll(CONTENT_TYPE);
    if (arr.length > 0) {
      return arr[arr.length - 1];
    }
    return undefined;
  }

  /**
   * set content type
   * @param contentType
   */
  public setContentType(contentType: string): void {
    this.set(CONTENT_TYPE, contentType);
  }

  /**
   * Content Type is application/json
   * @param contentType
   * @returns {boolean}
   */
  public static isJSON(contentType?: string): boolean {
    if (contentType) {
      return contentType.trim().toLocaleLowerCase().indexOf(APPLICATION_JSON) !== -1;
    }
    return false;
  }

  public get isJSON(): boolean {
    return HeaderManager.isJSON(this.getContentType());
  }

  /**
   * Content Type is application/x-www-form-urlencoded
   * @param contentType
   * @returns
   */
  public static isForm(contentType?: string): boolean {
    if (contentType) {
      return contentType.trim().toLocaleLowerCase().indexOf(APPLICATION_X_WWW_FORM_URLENCODED) !== -1;
    }
    return false;
  }

  public get isForm(): boolean {
    return HeaderManager.isForm(this.getContentType());
  }

  /**
   * Content Type is multipart/form-data
   * @param contentType
   * @returns {boolean}
   */
  public static isMultipartForm(contentType?: string): boolean {
    if (contentType) {
      return contentType.trim().toLocaleLowerCase().indexOf(MULTIPART_FORM_DATA) !== -1;
    }
    return false;
  }

  public get isMultipartForm(): boolean {
    return HeaderManager.isMultipartForm(this.getContentType());
  }

  /**
   * Content Type is application/xml or text/xml
   * @param contentType
   * @returns {boolean}
   */
  public static isXML(contentType?: string): boolean {
    if (contentType) {
      const str = contentType.trim().toLocaleLowerCase();
      return str.indexOf(APPLICATION_XML) === 0 || str.indexOf(TEXT_XML) !== -1;
    }
    return false;
  }

  public get isXML(): boolean {
    return HeaderManager.isXML(this.getContentType());
  }

  /**
   * get charset
   * @returns {string | undefined}
   */
  public static getCharset(contentType?: string): string | undefined {
    if (contentType) {
      const str = contentType.trim().toLocaleLowerCase();
      const ret = str.match(/charset=([\w-]+)/); // utf-8
      if (ret && ret[1]) {
        return ret[1];
      }
    }
    return undefined;
  }

  public get charset(): string | undefined {
    return HeaderManager.getCharset(this.getContentType());
  }

  /**
   * 对一些特殊字段的大小写修正，让他们唯一存在
   * 这里可能有性能损耗，如果损耗太大，直接改为一个特定值
   * @notice RFC 2616 RFC 7540 规定 headers 不区分大小写 发送的时候的确也是小写的，这部分代码考虑去掉
   * @param name
   * @returns {string}
   */
  private getSpecialFields(name: string): string {
    // const field = name.toLowerCase();
    // let _name: string = name;
    // if (SPECIAL_FIELDS[field]) {
    //   // eslint-disable-next-line no-restricted-syntax
    //   for (const key of this.keys()) {
    //     if (key.toLowerCase() === field) {
    //       _name = key;
    //       break;
    //     }
    //   }
    // }
    // return _name;
    if (typeof name === 'string') {
      return name.toLowerCase();
    }
    return '';
  }

  public get(name: string): string | null {
    return super.get(this.getSpecialFields(name));
  }

  public getAll(name: string): string[] {
    return super.getAll(this.getSpecialFields(name));
  }

  public set(name: string, value: string): void {
    return super.set(this.getSpecialFields(name), value);
  }

  public append(name: string, value: string): void {
    return super.append(this.getSpecialFields(name), value);
  }

  public delete(name: string): void {
    return super.delete(this.getSpecialFields(name));
  }

  public has(name: string): boolean {
    return super.has(this.getSpecialFields(name));
  }

  /**
   * Raw Format
   * key: value
   * @param charset
   * @param specialCare 特殊照顾，删除 content-length host
   * @returns {string}
   */
  public toString(charset = 'utf-8', specialCare = false): string {
    const data: string[] = [];
    let cookieIndex = -1;
    // eslint-disable-next-line no-restricted-syntax
    for (const [key, value] of this.entries()) {
      if (specialCare && (key === CONTENT_LENGTH || key === HOST)) {
        continue;
      }
      if (key === COOKIE) {
        // if (key.toLocaleLowerCase() === COOKIE) {
        if (cookieIndex === -1) {
          cookieIndex = data.length;
          data.push(`${key}: ${value}`);
        } else {
          data[cookieIndex] = `${data[cookieIndex]}${data[cookieIndex][data[cookieIndex].length] === ';' ? '' : ';'} ${value}`;
        }
      } else if (key === CONTENT_TYPE && !this.charset && !this.isMultipartForm) {
      // } else if (key.toLocaleLowerCase() === CONTENT_TYPE && !this.getCharset()) {
        data.push(`${key}: ${value}; charset=${charset}`);
      } else {
        data.push(`${key}: ${value}`);
      }
    }
    return data.join('\r\n');
  }

  /**
   * headers to data
   * @param charset
   * @param specialCare 特殊照顾，删除 content-length host
   * @returns {Data}
   */
  public toData(charset = 'utf-8', specialCare = false): Data {
    const data: Data = {};
    // eslint-disable-next-line no-restricted-syntax
    for (const key of this.keys()) {
      if (specialCare && (key === CONTENT_LENGTH || key === HOST)) {
        continue;
      }
      const values = this.getAll(key);
      if (key === CONTENT_TYPE) {
        const contentType = values.map((value) => {
          if (!HeaderManager.getCharset(value)
              && !HeaderManager.isMultipartForm(value)
              && !HeaderManager.isForm(value)
              && charset.toLowerCase() !== 'utf-8'
          ) {
            return `${value}; charset=${charset}`;
          }
          return value;
        });
        if (contentType.length === 1) {
          data[key] = contentType[0];
        } else {
          data[key] = contentType;
        }
      } else {
        if (values.length === 1) {
          data[key] = values[0];
        } else {
          data[key] = values;
        }
      }
    }
    return data;
  }
}
