/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
/* eslint-disable global-require */
/* eslint-disable import/no-dynamic-require */
import { opts } from '@/config';
import { isDeveloper } from '@/utils';

process.on('uncaughtException', (error, origin) => {
  console.log('[uncaught error 4]', error, origin);
});

process.on('unhandledRejection', (reason, promise) => {
  console.log('[uncaught error 5]', reason, promise);
});

if (opts.mock) {
  if (isDeveloper) {
    require('@/main/mock');
  } else {
    require(`${__dirname}/mock.js`);
  }
} else {
  if (isDeveloper) {
    require('@/main/engine');
  } else {
    require(`${__dirname}/engine.js`);
  }
}
