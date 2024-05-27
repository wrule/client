/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { configure } from 'log4js';
import { isDeveloper } from '@/utils';
import { opts } from '@/config';
import xconfig from '@/xconfig';
// [2021-08-23T19:03:03.319] [INFO] src/controller/base.ts:198 ✅ [71] [HTTP] [dev_0_17] status = DONE, time = 8ms
// [2021-08-23T19:03:03.319] [INFO] ✅ [71] [HTTP] [dev_0_17] status = DONE, time = 8ms
const pattern = isDeveloper ? '%[[%d] [%p] %f{3}:%l %]%m' : '%[[%d] [%p] %]%m';

const log4js = configure({
  appenders: {
    stdout: {
      type: 'console',
      layout: {
        type: 'pattern',
        pattern,
      },
    },
  },
  categories: {
    default: {
      appenders: ['stdout'], level: opts.logLevel, enableCallStack: isDeveloper,
    },
  },
});

const Logger = log4js.getLogger('XEngine');
if (xconfig.noLogger) {
  Logger.level = 'OFF';
}
const log = console.log;
console.log = (...args) => {
  const first = args[0];
  if (first === 1234) return;
  log(...args);
};
export default Logger;
