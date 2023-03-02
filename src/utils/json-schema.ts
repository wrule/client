/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { isObject } from '@/utils';

// 注意实现的与通用规则是有区别的

export const JSON_TYPE = {
  OBJECT: 'object',
  ARRAY: 'array',
  NUMBER: 'number',
  INTEGER: 'integer',
  BOOLEAN: 'boolean',
  STRING: 'string',
  NULL: 'null',
} as const;

interface XMLAttributes {
  key: string;
  value: string;
}

/**
 * 基础 JSONSchema 结构
 * @notice 暂不支持 anyOf oneOf allOf not （以后应该也不会支持）
 */
export interface JSONSchema {
  type: typeof JSON_TYPE[keyof typeof JSON_TYPE];
  properties?: Record<string, JSONSchema>;
  items?: JSONSchema | JSONSchema[];
  // items?: JSONSchema;
  required?: string[];
  title?: string;
  description?: string;
  example?: boolean | string | number | null;
  xml?: {
    attributes: XMLAttributes[];
  };
}

// /**
//  * 根据 JSONSchema 修正 JSON 数据 仅仅修正基础类型，不会修正 Array 以及 Object
//  * @notice 暂不支持 anyOf oneOf allOf not （以后应该也不会支持）
//  * @param json
//  * @param jsonSchema
//  * @returns
//  */
// export const changeTypeFromJSONSchema = (json: unknown, jsonSchema?: JSONSchema | null): unknown => {
//   if (!jsonSchema || !jsonSchema.type) return json;
//   const type = jsonSchema.type;
//   if (Array.isArray(json)) {
//     if (type.includes(JSON_TYPE.ARRAY) && jsonSchema.items) {
//       const items = jsonSchema.items;
//       return json.map((dat, index): any => {
//         const js = Array.isArray(items)
//           ? items[index] || items[0]
//           : items;
//         return changeTypeFromJSONSchema(dat, js);
//       });
//     }
//   } else if (isObject(json)) {
//     if (type.includes(JSON_TYPE.OBJECT) && jsonSchema.properties) {
//       const data: Record<string, unknown> = {};
//       const properties = jsonSchema.properties;
//       Object.keys(json).forEach((key) => {
//         data[key] = changeTypeFromJSONSchema((json as Record<string, unknown>)[key], properties[key]);
//       });
//       return data;
//     }
//   } else if (json === null && !type.includes(JSON_TYPE.NULL)) {
//     if (type.includes(JSON_TYPE.STRING)) return 'null';
//     if (type.includes(JSON_TYPE.NUMBER)) return Number(json);
//     if (type.includes(JSON_TYPE.INTEGER)) return 0;
//   } else if (typeof json === 'number' && !type.includes(JSON_TYPE.NUMBER)) {
//     if (type.includes(JSON_TYPE.STRING)) return json.toString();
//     if (type.includes(JSON_TYPE.INTEGER)) return json >>> 0;
//     if (type.includes(JSON_TYPE.BOOLEAN)) {
//       return json !== 0;
//     }
//   } else if (typeof json === 'string' && !type.includes(JSON_TYPE.STRING)) {
//     if (type.includes(JSON_TYPE.NUMBER)) return Number(json);
//     if (type.includes(JSON_TYPE.INTEGER)) return Number(json) >>> 0;
//     if (type.includes(JSON_TYPE.NULL) && json === 'null') return null;
//     if (type.includes(JSON_TYPE.BOOLEAN)) {
//       if (json === '0') return false;
//       return json !== 'false';
//     }
//   } else if (typeof json === 'boolean' && !type.includes(JSON_TYPE.BOOLEAN)) {
//     if (type.includes(JSON_TYPE.NUMBER)) return Number(json);
//     if (type.includes(JSON_TYPE.STRING)) return json.toString();
//     if (type.includes(JSON_TYPE.NULL)) return null;
//     if (type.includes(JSON_TYPE.INTEGER)) return json ? 1 : 0;
//   }

//   return json;
// };
