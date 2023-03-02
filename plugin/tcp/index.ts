/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */

/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import TCPController from '@plugin/tcp/controller';
import { CONTROLLER_TYPE, DATA_SOURCE_TYPE } from '@engine/core/enum';
import { registerController } from '@engine/core';

registerController(CONTROLLER_TYPE.TCP, {
  controller: TCPController,
});

// setInterval(() => {
//   console.log(pool.connection[0].free);
// }, 100);

// import net from 'node:net';

// const socket = new net.Socket({
//   // allowHalfOpen: false,
// });
// // socket.setTimeout(1000);

// socket.on('ready', () => {
//   console.log('ready');
// });

// socket.on('connect', () => {
//   console.log('connect');
// });

// socket.on('data', () => {
//   console.log('data');
// });

// socket.on('end', () => {
//   console.log('end');
// });

// socket.on('close', () => {
//   console.log('close');
//   setTimeout(() => {
//     socket.connect(80, 'www.google.com');
//   }, 2000);
// });

// socket.on('error', (e) => {
//   console.log(e);
//   console.log('error');
// });

// socket.on('timeout', () => {
//   console.log('socket timeout');
//   // socket.end();
// });
// socket.on('lookup', () => {
//   console.log('lookup');
//   // socket.end();
// });
// socket.setKeepAlive(true, 1000);
// // console.log(socket);
// socket.connect(80, 'www.google.co2m1');

// console.log('created');
// setInterval(() => {
//   console.log(socket.connecting);
//   // console.log(socket.wrap);
// }, 500);
// // setTimeout(() => {
// //   socket.end();
// // }, 2000);
// // close
// // connect
// // data
// // drain
// // end
// // error
// // lookup
// // ready
// // timeout
