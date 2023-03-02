/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
/* eslint-disable no-bitwise */
import mime from 'mime';
import { MULTIPART_FORM_DATA } from '@plugin/http/utils/params-manager/header';
import { HTTPMultipartFormData } from '@plugin/http/types/data';
import { urlEncode } from '@plugin/http/utils';
import VariableManager from '@engine/variable';
import { readFile, FileData } from '@engine/utils/file';
import { FileCache } from '@engine/core/execute';
import iconv from 'iconv-lite';

interface Option extends Partial<FileData> {
  /** 内容 如果有 以内容为准 */
  content?: string | Buffer;
  /** 文件的 Content Type 如果没有 会用扩展名计算 */
  contentType?: string;
  /** 文件名 协议上可不填 */
  filename?: string;
}

interface Params {
  [x: string]: Option[];
}

interface FormParamsManager {
  entries(): IterableIterator<[string, Option]>;
  keys(): IterableIterator<string>;
  values(): IterableIterator<Option>;
  toString(charset: string): string;
  toBuffer(charset: string, cache?: FileCache): Promise<Buffer>;
  get(name: string): Option | null;
  getAll(name: string): Option[];
  set(name: string, value: Buffer | string | Option): void;
  append(name: string, value: Buffer | string | Option): void;
  delete(name: string): void;
  has(name: string): boolean;
  sort(): void;
  clear(): void;
}
// [Content-Type] => multipart/form-data; boundary=--------------------------boundary
// ------------------------------boundary
// Content-Disposition: form-data; name="my_field"
//
// my value
// ----------------------------boundary
// Content-Disposition: form-data; name="my_field"
//
// my value
// ----------------------------boundary
// Content-Disposition: form-data; name="test"; filename="unicycle.png"
// Content-Type: image/png
//
// <File Binary Content>
// ----------------------------boundary--
//

/**
 * form-data multipart/form-data
 * 但是不能替换变量 TAT 故需要自己实现 lite 版
 * 核心模块 性能第一
 * @param {VariableManager} variable
 */
export default class FormDataManager implements FormParamsManager {
  protected data: Params = {};
  protected readonly variable?: VariableManager;
  private boundary = '';

  /**
   * 构造函数，允许传递变量管理器，获取内容时会被处理
   * @param variable
   */
  public constructor(form?: HTTPMultipartFormData[] | VariableManager, variable?: VariableManager) {
    if (form instanceof VariableManager) {
      this.variable = form;
    } else {
      this.variable = variable;
      if (form) {
        if (Array.isArray(form)) {
          form.forEach((item) => {
            this.append(item.name, item);
          });
        }
      }
    }
    // 这里可以优化的 随便写一下
    this.boundary = `----EngineFormBoundary${'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : ((r & 0x3) | 0x8);
      return v.toString(16);
    })}`;
    // this.boundary = '------WebKitFormBoundarym1RM1toxs1pzYc07';
    // multipart/form-data; boundary=----WebKitFormBoundarym1RM1toxs1pzYc07
  }

  public setBoundary(boundary: string): void {
    this.boundary = boundary;
  }

  public getBoundary(): string {
    return this.boundary;
  }

  public getHeader(): string {
    return `${MULTIPART_FORM_DATA}; boundary=${this.getBoundary()}`;
  }

  /**
   * toString 获取结果用
   * @see https://datatracker.ietf.org/doc/html/rfc1867
   * @param charset
   * @returns
   */
  public toString(encoding = 'utf-8'): string {
    const boundary = `--${this.boundary}`;
    let buffer = '';
    const line = '\r\n';
    // eslint-disable-next-line no-restricted-syntax
    for (const [key, value] of this.entries()) {
      let str = `Content-Disposition: form-data; name="${key}"`;
      if (value.filename) {
        /**
         * 这里写死的UTF-8 应该不需要修改
         * @see https://datatracker.ietf.org/doc/html/rfc6266#section-4.3
         */
        str += `; filename="${value.filename}"; filename*=utf-8''${urlEncode(value.filename)}\r\n`;
      } else {
        str += '\r\n';
      }
      if (value.contentType) {
        str += `Content-Type: ${value.contentType}\r\n`;
      } else if (value.filename) {
        const contentType = mime.getType(value.filename) || 'application/octet-stream';
        str += `Content-Type: ${contentType}\r\n`;
      }
      let content = '';
      if (value.content) {
        if (Buffer.isBuffer(value.content) || value['@fileKey']) {
          content = '<Binary Content, not shown>';
        } else {
          content = value.content;
        }
      }
      buffer = [buffer, boundary, line, str, line, content, line].join('');
    }
    return [buffer, boundary, '--', line].join('');
  }

  /**
   * buffer
   * @see https://datatracker.ietf.org/doc/html/rfc1867
   * @param charset
   * @returns
   */
  public async toBuffer(encoding = 'utf-8', cache?: FileCache): Promise<Buffer> {
    const boundary = Buffer.from(`--${this.boundary}`);
    let buffer = Buffer.from('');
    const line = new Uint8Array([0x0D, 0x0A]);
    // eslint-disable-next-line no-restricted-syntax
    for (const [key, value] of this.entries()) {
      let str = `Content-Disposition: form-data; name="${key}"`;
      // concat file name
      if (value.filename) {
        /**
         * 这里写死的UTF-8 应该不需要修改
         * @see https://datatracker.ietf.org/doc/html/rfc6266#section-4.3
         */
        str += `; filename="${value.filename}"; filename*=utf-8''${urlEncode(value.filename)}\r\n`;
      } else {
        str += '\r\n';
      }
      // concat content type
      if (value.contentType) {
        str += `Content-Type: ${value.contentType}\r\n`;
      } else if (value.filename) {
        const contentType = mime.getType(value.filename) || 'application/octet-stream';
        str += `Content-Type: ${contentType}\r\n`;
      }
      let content!: Buffer;
      if (value.content) {
        // iconv
        if (encoding.toLowerCase() !== 'utf-8') {
          if (!Buffer.isBuffer(value.content)) {
            content = iconv.encode(value.content, encoding);
          }
        } else {
          content = Buffer.isBuffer(value.content) ? value.content : Buffer.from(value.content);
        }
      } else if (value['@fileKey']) {
        /**
         * 这里肯定会进内存 暂时无解
         * @fixme 可有优化 当有循环读取文件性能会很低
         */
        if (cache && cache[value['@fileKey']]) {
          content = cache[value['@fileKey']];
        } else {
          content = await readFile(value as FileData);
        }
        // eslint-disable-next-line no-param-reassign
        if (cache) cache[value['@fileKey']] = content;
      } else {
        content = Buffer.from('');
      }
      buffer = Buffer.concat([buffer, boundary, line, Buffer.from(str), line, content, line]);
    }
    return Buffer.concat([buffer, boundary, Buffer.from('--'), line]);
  }

  /**
   * 变量替换
   * @param item
   * @returns
   */
  private replace(item: Option[]): Option[];
  private replace(item: Option): Option;
  private replace(item?: Option | Option[]): Option | Option[] | undefined {
    if (item !== undefined) {
      const variable = this.variable;
      if (!variable) return item;
      if (Array.isArray(item)) {
        return item.map((value) => ({
          ...value,
          content: variable.replace(value.content),
          filename: variable.replace(value.filename),
          contentType: variable.replace(value.contentType),
        }));
      }
      return {
        ...item,
        content: variable.replace(item.content),
        filename: variable.replace(item.filename),
        contentType: variable.replace(item.contentType),
      };
    }
    return item;
  }

  private formatOption(value: string | Option | Buffer): Option | null {
    if (value !== null && value !== undefined) {
      if (Buffer.isBuffer(value) || typeof value === 'string') {
        return {
          content: value,
        };
      }
      if (typeof value === 'object') {
        return value;
      }
    }
    return null;
  }

  public get(name: string): Option | null {
    if (name in this.data) {
      return this.replace(this.data[name][0]);
    }
    return null;
  }

  public getAll(name: string): Option[] {
    if (name in this.data) {
      return this.replace(this.data[name]);
    }
    return [];
  }

  public set(name: string, value: string | Option | Buffer): void {
    const option = this.formatOption(value);
    if (option) {
      this.data[name] = [option];
    }
  }

  public append(name: string, value: string | Option): void {
    const option = this.formatOption(value);
    if (option) {
      if (name in this.data) {
        this.data[name].push(option);
      } else {
        this.data[name] = [option];
      }
    }
  }

  public delete(name: string): void {
    delete this.data[name];
  }

  public has(name: string): boolean {
    return name in this.data;
  }

  public clear(): void {
    this.data = {};
  }

  // public [Symbol.iterator] = function* generator() {
  //   // for (let i = 0; i < data.length; i++) {
  //   //   yield list[i];
  //   // }
  // };

  /**
   * keys Iteration
   * @returns
   */
  public keys(): IterableIterator<string> {
    const arr = Object.keys(this.data);
    const iterator = {
      index: 0,
      next: () => {
        const result = {
          value: arr[iterator.index],
          done: iterator.index >= arr.length,
        };
        iterator.index += 1;
        return result;
      },
      [Symbol.iterator]() {
        return iterator;
      },
    };
    return iterator;
  }

  /**
   * entries Iteration
   * @returns
   */
  public entries(): IterableIterator<[string, Option]> {
    const arr = Object.keys(this.data);
    const data = this.data;
    const iterator = {
      index: 0,
      length: 0,
      next: () => {
        const key = arr[iterator.index];
        const obj = data[key] || [];
        const value: [string, Option] = [key, this.replace(obj[iterator.length])];
        const result = {
          value,
          done: iterator.index >= arr.length && iterator.length >= obj.length,
        };
        if (obj.length - 1 === iterator.length) {
          iterator.length = 0;
          iterator.index += 1;
        } else {
          iterator.length += 1;
        }
        return result;
      },
      [Symbol.iterator]() {
        return iterator;
      },
    };

    return iterator;
  }

  /**
   * 迭代器 for of
   */
  public [Symbol.iterator] = this.entries;

  /**
   * values Iteration
   * @returns
   */
  public values(): IterableIterator<Option> {
    const arr = Object.keys(this.data);
    const data = this.data;
    const iterator = {
      index: 0,
      length: 0,
      next: () => {
        const key = arr[iterator.index];
        const obj = data[key] || [];
        const value = this.replace(obj[iterator.length]);
        const result = {
          value,
          done: iterator.index >= arr.length && iterator.length >= obj.length,
        };
        if (obj.length - 1 === iterator.length) {
          iterator.length = 0;
          iterator.index += 1;
        } else {
          iterator.length += 1;
        }
        return result;
      },
      [Symbol.iterator]() {
        return iterator;
      },
    };
    return iterator;
  }

  /**
   * ascii key sort
   */
  public sort(): void {
    const data: Params = {};
    Object.keys(this.data).sort().forEach((key) => {
      data[key] = this.data[key];
    });
    this.data = data;
  }

  /**
   * forEach
   */
  public forEach(callback: (value: any, key: string) => void, thisArg?: unknown): void {
    // eslint-disable-next-line no-restricted-syntax
    for (const [key, value] of this.entries()) {
      callback.call(thisArg, value, key);
    }
  }
}
