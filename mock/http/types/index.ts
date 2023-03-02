/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { JSONSchema } from '@engine/utils/json-schema';
import { ASSERT } from '@engine/assert';
// import { RouteOptionsCors } from '@hapi/hapi';
import { FieldRules } from '@mock/utils/fields';

export interface MockJSONSchema extends JSONSchema {
  mock?: {
    /** 仅支持 @xx语法 */
    mock: string;
  };
  properties?: Record<string, MockJSONSchema>;
  items?: MockJSONSchema | MockJSONSchema[];
}

export interface Assert {
  key: string;
  /** path/headers/params/form/formData */
  area: 'path' | 'headers' | 'params' | 'form' | 'formData' | 'body';
  /** 断言 */
  assert: ASSERT;
  /** 断言的值 有些断言不需要 */
  value?: string;
}
/**
 * 高级mock中的断言组，每组断言包含多个断言和一个指向结果
 */
export interface AssertGroup {
  /** 需要断言的条目 */
  asserts: Assert[];
  /** 关联一个响应 */
  target: string;
}

export interface ResponseHeaders {
  key: string;
  value: string;
}

/**
 * 结果用 swagger 导入的会有多个
 */
export interface Response {
  /** 响应的唯一ID */
  id: string;
  /** 返回的 contentType 根据内容自动格式化 支持JSON和XML */
  contentType: string;
  /** 返回结构体 不想返回结构体直接给 string */
  schema?: MockJSONSchema;
  /** body JSONSchema 二选一 优先 body */
  body?: string;
  /** 状态码 */
  statusCode?: number;
  /** 延迟 */
  timeout?: number;
  /** XML Header */
  xmlHeader?: string;
  /** 响应的 headers */
  headers?: ResponseHeaders[];
}

/**
 * Mock的路由
 * 如果 path method 填写冲突的值会报错
 * 如果 ID 相同 查询和更新的时候 永远只更新第一个
 */
export interface Route {
  id: string;
  /** 请求路径 支持 /api/{id} */
  path: string;
  method: string;
  response: Response[];
  /**
   * 规则匹配
   * 没有或者不匹配选第一条的 JSONSchema/body 返回
   */
  assertGroup?: AssertGroup[];
  /**
   * mock 预处理 有一些API
   * 和上面的 assertGroup 二选一 优先脚本
   */
  script?: string;
}

export interface HTTPRules {
  /**
   * 用户设置的mock规则 有相同的会覆盖全局的
   * 优先级比全局的高
   */
  fields?: FieldRules[];
  /** 前端跨域配置 */
  // cors?: RouteOptionsCors;
  /** 全局模拟延迟 */
  timeout?: number;
  routes: Route[];
}

export type Rules = Record<string, HTTPRules>;

export interface HTTPMockConfig {
  port: number;
  host: string;
  /**
   * 每个应用是一个规则集 appid也不要改变 会改变mock地址
   * 应用名必须唯一 规则集允许动态刷新
   * 生成的地址是 /mock/{appid}/{route}
   */
  rules: Rules;
}
