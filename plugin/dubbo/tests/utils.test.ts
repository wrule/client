/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { expect } from 'chai';
import { JSONSchemaToDubboParams, JavaJSONSchema } from '@plugin/dubbo/utils';

describe('dubbo utils', () => {
  it('urlEncodeFromEncoding', async () => {
    const jsonSchemas: JavaJSONSchema = {
      type: 'array',
      javaType: 'java.lang.Object[]',
      items: [{
        type: 'array',
        javaType: 'java.util.List<com.example.test.dubbo.api.request.NumberData>',
        items: {
          type: 'object',
          javaType: 'com.example.test.dubbo.api.request.NumberData',
          properties: {
            anInt: {
              type: 'integer',
              javaType: 'int',
              title: 'anInt',
            },
            integer: {
              type: 'number',
              javaType: 'java.lang.Integer',
              title: 'integer',
            },
          },
          title: 'items',
        },
        title: 'numberData',
      }],
    };

    const jsons: unknown = [
      [
        { anInt: 1, integer: 2 },
        { anInt: 1, integer: 2 },
        { anInt: 1, integer: 2 },
        { anInt: 1, integer: 2 },
      ],
    ];

    expect(JSON.stringify(JSONSchemaToDubboParams(jsons, jsonSchemas))).to.be.equal('{"$class":"java.lang.Object[]","$data":[{"$class":"java.util.List","$data":[{"$class":"com.example.test.dubbo.api.request.NumberData","$data":{"anInt":{"$class":"int","$data":1},"integer":{"$class":"java.lang.Integer","$data":2}}},{"$class":"com.example.test.dubbo.api.request.NumberData","$data":{"anInt":{"$class":"int","$data":1},"integer":{"$class":"java.lang.Integer","$data":2}}},{"$class":"com.example.test.dubbo.api.request.NumberData","$data":{"anInt":{"$class":"int","$data":1},"integer":{"$class":"java.lang.Integer","$data":2}}},{"$class":"com.example.test.dubbo.api.request.NumberData","$data":{"anInt":{"$class":"int","$data":1},"integer":{"$class":"java.lang.Integer","$data":2}}}]}]}');
  });
});
