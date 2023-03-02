/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
// @ts-nocheck
import { MockConfig } from '@mock/types';

const config: MockConfig = {
  worker: 1,
  control: {
    host: '127.0.0.1',
    port: 3001,
  },
  http: {
    host: '0.0.0.0',
    port: 3000,
    rules: {
      test: {
        fields: [
          {
            type: [
              'string',
            ],
            ignoreCase: true,
            pattern: 'avatar|icon',
            mock: "@image('100x100')",
          },
          {
            type: [
              'string',
            ],
            ignoreCase: true,
            pattern: 'image|img|photo|pic',
            mock: "@image('400x400')",
          },
          {
            type: [
              'string',
            ],
            ignoreCase: true,
            pattern: '.*url',
            mock: "@url('http')",
          },
          {
            type: [
              'string',
            ],
            ignoreCase: true,
            pattern: 'nick|user_?name',
            mock: '@cname',
          },
          {
            type: [
              'string',
            ],
            ignoreCase: true,
            pattern: 'title|name|.*tip$',
            mock: '@ctitle',
          },
          {
            type: [
              'integer',
              'number',
              'string',
            ],
            ignoreCase: true,
            pattern: 'id|num|code|amount|quantity|price|discount|balance|money',
            mock: '@natural(1,100)',
          },
          {
            type: [
              'integer',
              'number',
              'string',
            ],
            ignoreCase: true,
            pattern: 'phone|mobile|tel$',
            mock: '@phone',
          },
          {
            type: [
              'string',
            ],
            ignoreCase: true,
            pattern: '.*date',
            mock: "@date('yyyy-MM-dd')",
          },
          {
            type: [
              'integer',
              'number',
            ],
            ignoreCase: true,
            pattern: '.*date',
            mock: "@date('yyyyMMdd')",
          },
          {
            type: [
              'string',
            ],
            ignoreCase: true,
            pattern: 'created?_?at|updated?_?at|deleted?_?at|.*time',
            mock: "@datetime('yyyy-MM-dd HH:mm:ss')",
          },
          {
            type: [
              'integer',
              'number',
            ],
            ignoreCase: true,
            pattern: 'created?_?at|updated?_?at|deleted?_?at|.*time',
            mock: "@datetime('T')",
          },
          {
            type: [
              'string',
            ],
            ignoreCase: true,
            pattern: 'e?mail*',
            mock: "@email('163.com')",
          },
          {
            type: [
              'string',
            ],
            ignoreCase: true,
            pattern: '.*province.*',
            mock: '@province',
          },
          {
            type: [
              'string',
            ],
            ignoreCase: true,
            pattern: '.*city.*',
            mock: '@city',
          },
          {
            type: [
              'string',
            ],
            ignoreCase: true,
            pattern: '.*address',
            mock: '@address',
          },
          {
            type: [
              'string',
            ],
            ignoreCase: true,
            pattern: '.*district',
            mock: '@county',
          },
          {
            type: [
              'string',
            ],
            ignoreCase: true,
            pattern: '.*ip$',
            mock: '@ip',
          },
          {
            type: [
              'string',
            ],
            ignoreCase: true,
            pattern: 'birthday',
            mock: "@date('yyyy-MM-dd')",
          },
          {
            type: [
              'integer',
              'number',
            ],
            ignoreCase: true,
            pattern: 'birthday',
            mock: '@date(yyyyMMdd)',
          },
          {
            type: [
              'string',
            ],
            ignoreCase: true,
            pattern: 'gender|sex',
            mock: '@pick(["男","女"])',
          },
          {
            type: [
              'string',
            ],
            ignoreCase: true,
            pattern: 'description',
            mock: '@cparagraph',
          },
        ],
        routes: [
          {
            path: '/v2/pet',
            method: 'POST',
            response: [
              {
                contentType: 'text/xml',
                body: "<?xml version=\"1.0\" ?> \n<!DOCTYPE note [\n  <!ELEMENT note (to,from,heading,body)>\n  <!ELEMENT to      (#PCDATA)>\n  <!ELEMENT from    (#PCDATA)>\n  <!ELEMENT heading (#PCDATA)>\n  <!ELEMENT body    (#PCDATA)>\n]>\n<note>\n<to>Tove</to> \n<from>Jani</from> \n<heading>Reminder</heading> \n<message>Don't forget me this weekend!</message> \n</note>",
                statusCode: 200,
                headers: [
                  {
                    key: 'Content-Type',
                    value: 'text/xml',
                  },
                ],
                id: 'http_mock_1567099003368132610',
              },
              {
                statusCode: 405,
                headers: [],
                id: 'api_http_143787',
              },
            ],
            assertGroup: [
              {
                asserts: [
                  {
                    key: 'Content-Type',
                    area: 'headers',
                    value: 'application/json',
                    assert: 0,
                  },
                  {
                    area: 'body',
                    value: '{"id":1,"name":"doggie","tags":[{"id":1,"name":"beiguo"}],"status":"1","category":{"id":1,"name":"beiguo"},"photoUrls":[""]}',
                    assert: 4,
                  },
                ],
                target: 'http_mock_1567099003368132610',
              },
              {
                asserts: [],
                target: 'api_http_143787',
              },
            ],
            id: '143787',
          },
        ],
      },
    },
  },
};

// console.log(yaml.stringify(config));

export default config;
