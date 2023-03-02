/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */

export interface GetOptions {
  content: unknown;
}

export interface JSONOptions {
  content: unknown;
  path: string;
  /** 是否递归提取 */
  recursion?: boolean;
}

export interface JSONPathOptions {
  content: unknown;
  path: string;
}

export interface HTMLOptions {
  content: string;
  path: string;
  /**
   * 第一个参数为调用的方法 第二个参数为传参
   * eg ['text'] ['attr', 'text']
   */
  expression: string[];
}

export interface RegExpOptions {
  content: string;
  exp: string;
  flags?: string;
  index?: number | string;
}

export interface XMLOptions {
  content: unknown;
  path: string;
  /** 是否使用属性模式 */
  attributeMode?: boolean;
}

export type AssignmentOptions = GetOptions | JSONOptions | JSONPathOptions | HTMLOptions | RegExpOptions | XMLOptions;
