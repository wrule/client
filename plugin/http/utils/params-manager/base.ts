/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
/* eslint-disable max-classes-per-file */
/* eslint-disable no-dupe-class-members */
import VariableManager, { REPLACE_MODE } from '@engine/variable';

export interface ParamsManager {
  [Symbol.iterator](): IterableIterator<[string, string]>;
  entries(): IterableIterator<[string, string]>;
  keys(): IterableIterator<string>;
  values(): IterableIterator<string>;
  toString(charset?: string): string;
  toData(charset?: string): Data;
  get(name: string): string | null;
  getAll(name: string): string[];
  set(name: string, value: string): void;
  append(name: string, value: string): void;
  delete(name: string): void;
  has(name: string): boolean;
  sort(): void;
  clear(): void;
}

export type Data = Record<string, string[] | string | undefined>;
type Params = Record<string, string[]>;

/**
 * 实现 URLSearchParams 的参数管理器
 * 区别在于 获取时 支持变量替换
 * 核心模块 性能第一
 * @param {VariableManager} variable
 */
export default abstract class BaseParamsManager implements ParamsManager {
  protected data: Params = {};
  protected variable?: VariableManager;

  /**
   * 构造函数，允许传递变量管理器，获取内容时会被处理
   * @param variable
   */
  public constructor(variable?: VariableManager) {
    if (variable) this.variable = variable;
  }

  public abstract toString(charset: string): string

  /**
   * 获取kv结构
   * @param charset
   * @returns
   */
  public toData(charset = 'utf-8'): Data {
    const data: Data = {};
    // eslint-disable-next-line no-restricted-syntax
    for (const key of this.keys()) {
      data[key] = this.getAll(key);
    }
    return data;
  }

  /**
   * 变量替换
   * @param item
   * @returns
   */
  private replace(item: string[]): string[];
  private replace(item: string): string;
  private replace(item?: string | string[]): string | string[] | undefined {
    if (item !== undefined) {
      const variable = this.variable;
      if (!variable) return item;
      if (typeof item === 'string') {
        return variable.replace(item, REPLACE_MODE.STRING);
      }
      return item.map((value) => variable.replace(value, REPLACE_MODE.STRING));
    }
    return item;
  }

  public get(name: string): string | null {
    if (name in this.data) {
      return this.replace(this.data[name][0]);
    }
    return null;
  }

  public getAll(name: string): string[] {
    if (name in this.data) {
      return this.replace(this.data[name]);
    }
    return [];
  }

  public set(name: string, value: string): void {
    if (value !== undefined) {
      this.data[name] = [value.toString()];
    }
  }

  public append(name: string, value: string): void {
    if (value !== undefined) {
      if (name in this.data) {
        this.data[name].push(value.toString());
      } else {
        this.data[name] = [value.toString()];
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
  public entries(): IterableIterator<[string, string]> {
    const arr = Object.keys(this.data);
    const data = this.data;
    const iterator = {
      index: 0,
      length: 0,
      next: () => {
        const key = arr[iterator.index];
        const obj = key !== undefined ? data[key] || [] : [];
        const value: [string, string] = [key, this.replace(obj[iterator.length])];
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
  public values(): IterableIterator<string> {
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
