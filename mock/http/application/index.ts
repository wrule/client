/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { XMLBuilder, XMLParser } from 'fast-xml-parser';
import http, { IncomingHttpHeaders } from 'node:http';
import get from 'lodash/get';
import { isDeveloper, sleep } from '@engine/utils';
import VariableManager, { VARIABLE_TYPE, Variable } from '@engine/variable';
import { ASSERT_FUNCTION } from '@engine/assert';
import logger from '@engine/logger';
import { MockJSONSchema, Response, AssertGroup, Route } from '@mock/http/types';
import { JSON_TYPE } from '@engine/utils/json-schema';
import { Request, ResponseData } from '@mock/http/types/server';
import { createVariables } from '@mock/http/utils';
import ApplicationBase from '@mock/http/application/base';
import HeaderManager from '@plugin/http/utils/params-manager/header';

const Mock: any = { };

const xmlBuilder = new XMLBuilder({
  attributeNamePrefix: '#',
  textNodeName: 'content',
  ignoreAttributes: false,
  processEntities: false,
  // format: true,
});

// const xmlParser1 = new XMLParser({
//   attributeNamePrefix: '#',
//   textNodeName: 'content',
//   ignoreAttributes: false,
//   parseTagValue: false,
// });

// const a = `<?xml version="1.0" encoding="UTF-8"?>
// <root><ua>curl/7.79.1</ua><userIp>186.172.9.125</userIp><ids>20</ids><ids>55</ids><ids>99</ids><ids>19</ids><ids>75</ids><ids>92</ids><remark>hndwktvlfuqr</remark><stageId>65</stageId><resultStatus>ifuuyruqwwofxkrsc</resultStatus></root>%
// `;
// console.log(xmlParser1.parse(a));

const replace = (str: string, variables: VariableManager): string | number => {
  const ret = Mock.mock(str);
  // 这个其实产品上感觉可以去除
  if (typeof ret === 'string' && ret.indexOf('$') !== -1) {
    return variables.replace(ret);
  }
  return ret;
};

/**
 * 处理执行过程和返回值的事
 */
export default class Application extends ApplicationBase {
  /**
   * 响应处理器
   * @param req
   * @param res
   * @returns {ResponseData}
   */
  public async handler(request: Request, res: http.ServerResponse, route: Route): Promise<ResponseData> {
    try {
      // 根据请求创建变量管理器
      const variables = createVariables(request);
      const variableManager = new VariableManager();
      variableManager.setVariables(VARIABLE_TYPE.CONTEXT, variables as unknown as Variable);
      /**
       * 第一优先级执行脚本
       * @todo
       */
      // if (cfg.script) {
      //   // @todo script
      // }

      /**
       * 高级 mock 断言匹配
       * 根据断言情况 选择一个返回结果
       * 如果没结果则选择第一个
       */
      let responseId = '';
      if (route.assertGroup) {
        responseId = this.getResponseId(route.assertGroup, variableManager);
      }
      const response = responseId ? route.response.find((item) => item.id === responseId) || route.response[0] : route.response[0];
      const responseData = this.createResponseData(response, variableManager);
      // 超时设置
      if (responseData.timeout || this.timeout) {
        await sleep(responseData.timeout || this.timeout || 0);
      }
      return responseData;
    } catch (e) {
      const body: Record<string, any> = {
        code: 500,
        error: {
          notice: 'Please check your mock configuration',
          message: `MockServer Error: ${e.message}`,
        },
        config: route,
      };
      logger.error(`[mock-response] ${e.name}: ${e.message}`);
      if (isDeveloper) {
        body.error.stack = e.stack.split('\n');
        logger.debug(`[mock-response] ${e.stack}`);
      }
      return {
        body,
        statusCode: 500,
      };
    }
  }

  /**
   * 根据断言结果获取 responseId
   * @param assertGroup
   * @param variables
   * @returns {string} responseId
   */
  private getResponseId(assertGroup: AssertGroup[], variables: VariableManager): string {
    for (let index = 0; index < assertGroup.length; index++) {
      const group = assertGroup[index];
      const ret = group.asserts.every((item) => {
        const fn = ASSERT_FUNCTION[item.assert];
        // const data = variables[item.area];
        if (fn) {
          const key = item.area === 'headers' ? item.key.toLowerCase() : item.key;
          // area in body
          if (item.area === 'body') {
            // only support json
            if (key) {
              const data = variables.get(item.area);
              const headers = variables.get<IncomingHttpHeaders>('headers');
              if (headers && headers['content-type']) {
                if (HeaderManager.isJSON(headers['content-type'])) {
                  return fn(get(data, key) as never, variables.replace(item.value) as never);
                }
              }
            }
            const rawBody = variables.get<Buffer>('rawBody');
            if (rawBody) {
              const str = rawBody.toString('utf-8');
              // body content length 0 is undefined
              return fn((str.length === 0 ? undefined : str) as never, variables.replace(item.value) as never);
            }
          } else {
            const data = variables.get<Record<string, any>>(item.area);
            if (data && typeof data === 'object') {
              return fn(data[key] as never, variables.replace(item.value) as never);
            }
          }
        }
        return false;
      });
      if (ret === true) {
        return group.target;
      }
    }
    return '';
  }

  /**
   * 创建字段内容
   * @param schema
   * @param variable
   * @param name
   * @returns {string | number | boolean}
   */
  private createContent(schema: MockJSONSchema, variable: VariableManager, name?: string): string | number | boolean {
    // 用户自己配置了 根据 mock 来
    if (schema.mock?.mock) {
      const val = replace(schema.mock.mock, variable);
      if (schema.type === JSON_TYPE.NUMBER || schema.type === JSON_TYPE.INTEGER) {
        // @fixme 可能会有NaN 序列化后是null
        return Number(val);
      }
      if (schema.type === JSON_TYPE.STRING) {
        return String(val);
      }
    }
    // 根据字段名来 mock 智能mock? 嗯?
    if (name) {
      for (let index = 0; index < this.fields.length; index++) {
        const field = this.fields[index];
        if (field.type.includes(schema.type) && field.pattern.test(name)) {
          const value = Mock.mock(field.mock);
          if (schema.type === JSON_TYPE.NUMBER || schema.type === JSON_TYPE.INTEGER) {
            // @fixme 可能会有NaN 序列化后是null
            return Number(value);
          }
          if (schema.type === JSON_TYPE.STRING) {
            return String(value);
          }
          return value;
        }
      }
    }
    if (schema.type === JSON_TYPE.BOOLEAN) {
      return Mock.mock('@boolean');
    }
    if (schema.type === JSON_TYPE.STRING) {
      return Mock.mock('@string("lower", 10, 20)');
    }
    if (schema.type === JSON_TYPE.INTEGER || schema.type === JSON_TYPE.NUMBER) {
      return Mock.mock('@int(0, 1 << 24)');
    }
    // 理论上不会到这里
    return schema.example || 'unknown field';
  }

  /**
   * 从 JSON Schema 创建 body
   * @param jsonSchema
   * @param variableManager
   * @param format
   * @returns {string}
   */
  private createBodyFromJSONSchema(jsonSchema: MockJSONSchema, variableManager: VariableManager, format: string): string {
    const loop = (schema: MockJSONSchema, name?: string): any => {
      if (schema.type === JSON_TYPE.OBJECT && schema.properties) {
        const data: any = {};
        const properties = schema.properties;
        Object.keys(properties).forEach((key) => {
          data[key] = loop(properties[key], key);
        });
        if (format === 'xml' && schema.xml) {
          schema.xml.attributes.forEach((item) => {
            data[`#${item.key}`] = replace(item.value, variableManager);
          });
        }
        return data;
      }
      if (schema.type === JSON_TYPE.ARRAY && schema.items) {
        const data: any[] = [];
        const items = schema.items;
        if (Array.isArray(items)) {
          if (items.length === 1) {
            for (let index = 0; index < Math.floor(Math.random() * (25 - 3)) + 1; index++) {
              data.push(loop(items[0], name));
            }
          } else {
            items.forEach((item) => {
              data.push(loop(item, name));
            });
          }
        } else {
          for (let index = 0; index < Math.floor(Math.random() * (25 - 3)) + 1; index++) {
            data.push(loop(items, name));
          }
        }
        return data;
      }
      const content = this.createContent(schema, variableManager, name);
      if (format === 'xml' && schema.xml) {
        const data: Record<string, unknown> = {};
        if (name !== '?xml') data.content = content;
        schema.xml.attributes.forEach((item) => {
          data[`#${item.key}`] = replace(item.value, variableManager);
        });
        return data;
      }
      return content;
    };
    if (format === 'xml') {
      const xml = xmlBuilder.build(loop(jsonSchema)) as string;
      return xml;
    }
    return loop(jsonSchema);
  }

  private createResponseData(response: Response, variableManager: VariableManager): ResponseData {
    const data = {
      headers: response.headers,
      timeout: response.timeout,
      statusCode: response.statusCode,
      contentType: response.contentType,
    } as ResponseData;
    const format = HeaderManager.isXML(response.contentType) ? 'xml' : 'json';

    if (response.body) {
      data.body = String(replace(response.body, variableManager));
    } else if (response.schema) {
      data.body = this.createBodyFromJSONSchema(response.schema, variableManager, format);
    }
    if (format === 'xml') {
      if (typeof data.body === 'string') {
        if (data.body.substring(0, 5) !== '<?xml') {
          if (response.xmlHeader) {
            data.body = `${response.xmlHeader}\n${data.body}`;
          } else {
            data.body = `<?xml version="1.0" encoding="UTF-8"?>\n${data.body}`;
          }
        }
      }
    }
    return data;
  }
}
