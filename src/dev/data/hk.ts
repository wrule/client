/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
/* eslint-disable no-template-curly-in-string */
/* eslint-disable camelcase */
/* eslint-disable @typescript-eslint/no-unused-vars */
// @ts-nocheck

import { CONTROLLER_TYPE, EXECUTE_EVENTS } from '@/core/enum';
import { DispatchData, ExecuteData, EXECUTE_MODE } from '@/dispatch';
import { ASSIGNMENT } from '@/assignment';
import { ASSERT } from '@/assert';
import { DATASET_FIELDS_MODE } from '@/core/enum/data-set';
import { JSON_TYPE } from '@/utils/json-schema';
import { httpServer, dataSource } from '@/dev/data/server';

import { HTTPControllerData } from '@plugin/http/types/data';
import { T2ControllerData } from '@plugin/t2/types/data';
import { MySQLControllerData } from '@plugin/mysql/types/data';
import { MSSQLControllerData } from '@plugin/mssql/types/data';
import { RedisControllerData } from '@plugin/redis/types/data';
import { MongoDBControllerData } from '@plugin/mongodb/types/data';
import { OracleDBControllerData } from '@plugin/oracledb/types/data';
import { PostgreSQLControllerData } from '@plugin/postgresql/types/data';
import { ComponentControllerData } from '@plugin/component/types/data';
import { ConditionControllerData } from '@plugin/condition/types/data';
import { LoopControllerData } from '@plugin/loop/types/data';
import { PollControllerData } from '@plugin/poll/types/data';
import { DataSetControllerData } from '@plugin/data-set/types/data';
import { ScriptControllerData } from '@plugin/script/types/data';
import { SleepControllerData } from '@plugin/sleep/types/data';

type SingleControllerDataGroup =

  HTTPControllerData | T2ControllerData |
  MySQLControllerData | RedisControllerData | MongoDBControllerData | OracleDBControllerData | MSSQLControllerData |
  PostgreSQLControllerData |
  ScriptControllerData | SleepControllerData;

type CombinationControllerDataGroup =
  ComponentControllerData | ConditionControllerData | LoopControllerData | PollControllerData | DataSetControllerData;

type ControllerData = SingleControllerDataGroup | CombinationControllerDataGroup;

const debugData: DispatchData = {
  env: {
    name: 'test',
    variable: {
      key: { hello: 123 },
      env: 'variable',
    },
    // httpServer,
    // dataSource,
  },
  execute: [
    {
      variable: {
        env2: 'value',
      },
      mode: EXECUTE_MODE.ASYNC,
      events: EXECUTE_EVENTS.PROGRESS
      | EXECUTE_EVENTS.STDERR
      | EXECUTE_EVENTS.STDOUT
      | EXECUTE_EVENTS.PRINT_STDOUT
      | EXECUTE_EVENTS.PRINT_STDERR,
      // | EXECUTE_EVENTS.IGNORE_EXECUTE_ERROR,
      steps: [
        {
          type: CONTROLLER_TYPE.POLL,
          interval: 2500,
          maxCount: 999999999999,
          steps: [
            {
              type: CONTROLLER_TYPE.LOOP,
              count: [
                { time: '2022-03-14' },
                { time: '2022-03-15' },
                { time: '2022-03-16' },
                { time: '2022-03-17' },
                { time: '2022-03-18' },
                { time: '2022-03-19' },
                { time: '2022-03-20' },
              ],
              config: {
                async: true,
                // ignoreError: true,
              },
              steps: [
                {
                  type: CONTROLLER_TYPE.HTTP,
                  method: 'POST',
                  path: '/webh5api/manage/query.book.info.data',
                  hostname: 'i.hzmbus.com',
                  protocol: 'https',
                  headers: [
                    { key: 'user-agent', value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.109 Safari/537.36' },
                    { key: 'authority', value: 'i.hzmbus.com' },
                    { key: 'pragma', value: 'no-cache' },
                    { key: 'accept', value: 'i.hzmbus.com' },
                    { key: 'authority', value: 'application/json, text/plain, */*' },
                    { key: 'content-type', value: 'application/json;charset=UTF-8' },
                    { key: 'origin', value: 'https://i.hzmbus.com' },
                    { key: 'referer', value: 'https://i.hzmbus.com/webhtml/ticket_details?xlmc_1=%E9%A6%99%E6%B8%AF&xlmc_2=%E7%8F%A0%E6%B5%B7&xllb=1&xldm=HKGZHO&code_1=HKG&code_2=ZHO' },
                  ],
                  body: {
                    bookDate: '${time}',
                    lineCode: 'HKGZHO',
                    appId: 'HZMBWEB_HK',
                    joinType: 'WEB',
                    version: '2.7.202203.1021',
                    equipment: 'PC',
                  },
                  postScript: [
                    {
                      type: 1,
                      timeout: 2000,
                      script: `
                      sys.set('done', false);

                      const data = post.getBodyAsJSON();
                      if (data.message === '成功') {
                        if (data.responseData.length > 1) {
                          sys.set('done', true);
                        } else {
                          // sys.console(sys.get('time') + '没票');
                          throw new Error(sys.get('time') + ' 没票')
                        }
                      } else {
                        console.log(data);
                        throw new Error('接口错误')
                      }
                      `,
                    },
                  ],
                },
                {
                  type: CONTROLLER_TYPE.CONDITION,
                  condition: '${done} === true',
                  steps: [
                    [{
                      type: CONTROLLER_TYPE.HTTP,
                      method: 'POST',
                      path: '/robot/send',
                      hostname: 'oapi.dingtalk.com',
                      protocol: 'https',
                      params: [
                        { key: 'access_token', value: '2d7225306f92a88bdb7b87959323e253fb034c699dbd4e560fd053d3a2b4c2b4' },
                      ],
                      headers: { 'Content-Type': 'application/json' },
                      body: {
                        msgtype: 'text',
                        text: {
                          content: 'XEngine: ${time} 有票了 https://i.hzmbus.com/webhtml/index.html',
                        },
                      },
                      postScript: [
                        {
                          type: 1,
                          timeout: 2000,
                          script: `
                          const data = post.getBodyAsJSON();
                          console.log(data)
                          `,
                        },
                      ],

                    }],
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};
export default debugData;
