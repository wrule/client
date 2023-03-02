/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
/* eslint-disable @typescript-eslint/no-use-before-define */

import java from 'js-to-java';
import { isObject } from '@engine/utils';
import { JSONSchema, JSON_TYPE } from '@engine/utils/json-schema';
import { DubboParams } from '@plugin/dubbo/types/data';

export interface HessianJavaEncoderData {
  ['$class']: string;
  ['$']: any;
}

function isDubboParams(data: unknown): data is DubboParams {
  if (typeof data === 'object' && data !== null) {
    if ('$class' in data && '$data' in data) {
      return true;
    }
  }
  return false;
}

function isHessianJavaEncoderData(data: unknown): data is HessianJavaEncoderData {
  if (typeof data === 'object' && data !== null) {
    if ('$class' in data && '$' in data) {
      return true;
    }
  }
  return false;
}

function parseContent(data: unknown): unknown {
  const content = data;
  if (isObject(content)) {
    const ret: Record<string, any> = {};
    Object.keys(content).forEach((key) => {
      ret[key] = parseData<any>(content[key]);
    });
    return ret;
  }
  if (Array.isArray(content)) {
    return content.map((item: DubboParams | unknown) => parseData<any[]>(item));
  }

  return content;
}

function parseData<T = HessianJavaEncoderData>(data: DubboParams | unknown): T {
  if (isDubboParams(data)) {
    const content = data.$data;
    // type[] and type[][]
    if (data.$class.slice(-2) === '[]' && Array.isArray(content)) {
      // 二维数组支持 先看下 能否支持
      const className = data.$class.slice(-4) === '[][]' ? `[${data.$class.slice(0, -4)}` : data.$class.slice(0, -2);
      return java.array(className, content.map((item: DubboParams | unknown) => parseData<any[]>(item))) as unknown as T;
    }
    // java.utils.List<array>
    if (Array.isArray(content)) {
      return java.combine(data.$class, content.map((item: DubboParams | unknown) => parseData<any[]>(item))) as unknown as T;
    }
    if (isObject(content)) {
      const ret: Record<string, any> = {};
      Object.keys(content).forEach((key) => {
        ret[key] = parseData<any>(content[key]);
      });
      return java.combine(data.$class, ret) as unknown as T;
    }
    return java.combine(data.$class, content) as unknown as T;
  }
  if (isHessianJavaEncoderData(data)) {
    return data as unknown as T;
  }
  // 不是 DubboData
  return parseContent(data) as T;
}

/**
 * 将编排结构体转为 HessianJavaEncoderData
 * @param data
 * @param variable
 * @returns {HessianJavaEncoderData[]}
 */
export const encode = (data: DubboParams[]): HessianJavaEncoderData[] => {
  if (!Array.isArray(data)) {
    throw new Error('Encode failed, please input dubbo $class and $data array params.');
  }
  const ret: HessianJavaEncoderData[] = [];
  data.forEach((item, index) => {
    if (isDubboParams(item)) {
      ret.push(parseData<HessianJavaEncoderData>(item));
    } else if (isHessianJavaEncoderData(item)) {
      ret.push(item);
    } else {
      throw new Error(`Encode failed, please input dubbo $class and $data, params index = ${index}`);
    }
  });
  return ret;
};

/**
 * 泛化调用编码
 * @param data
 * @returns
 */
export const encodeGeneric = (data: any): HessianJavaEncoderData[] => {
  // 泛化调用的情况 兼容下
  if (!Array.isArray(data)) {
    if (isObject(data)) {
      const ret: any = {};
      Object.keys(data).forEach((key) => {
        const item = data[key];
        if (isDubboParams(item)) {
          ret[key] = parseData<HessianJavaEncoderData>(item);
        } else {
          ret[key] = item;
        }
      });
      return ret;
    }
    return data;
  }
  const ret: HessianJavaEncoderData[] = [];
  data.forEach((item) => {
    if (isDubboParams(item)) {
      ret.push(parseData<HessianJavaEncoderData>(item));
    } else {
      ret.push(item);
    }
  });
  return ret;
};

/**
 * 用于可以生成 dubbo 类型
 */
export interface JavaJSONSchema extends JSONSchema {
  javaType: string;
  properties?: Record<string, JavaJSONSchema>;
  items?: JavaJSONSchema | JavaJSONSchema[];
}

/**
 * 将 JSONSchema 定义转换为 DubboParams
 * @param json
 * @param jsonSchema
 * @returns
 */
export function JSONSchemaToDubboParams(json: unknown, jsonSchema: JavaJSONSchema): DubboParams {
  const type = jsonSchema.type;
  const content = json;

  if (Array.isArray(content) && type === JSON_TYPE.ARRAY) {
    const items = jsonSchema.items;
    const $data: DubboParams[] = [];
    content.forEach((dat, index): any => {
      const js = Array.isArray(items)
        ? items[index] || items[0]
        : items;
      if (js) $data.push(JSONSchemaToDubboParams(dat, js));
    });
    return {
      $class: jsonSchema.javaType.replace(/<[^>]+>+/, ''),
      $data,
    };
  }
  if (isObject(content) && type === JSON_TYPE.OBJECT) {
    if (jsonSchema.properties) {
      const data: Record<string, unknown> = {};
      const properties = jsonSchema.properties;
      Object.keys(content).forEach((key) => {
        data[key] = JSONSchemaToDubboParams((content as Record<string, unknown>)[key], properties[key]);
      });
      return { $class: jsonSchema.javaType, $data: data };
    }
  }
  return { $class: jsonSchema.javaType, $data: content };
}
