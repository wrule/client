/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable global-require */
import http from 'node:http';
import { Server, Socket } from 'socket.io';
import ClientEvent, { OnlineClient, DispatchTask } from '@/server/event';
import Logger from '@/logger';
import { opts } from '@/config';
import net from 'net';
import path from 'path';
import { createProxyMiddleware } from 'http-proxy-middleware';

const dispatch: DispatchTask = {};
const online: OnlineClient = {};

export
function portBindCS(
  host: string,
  port: number,
  serverPort: number,
) {
  const server = net.createServer((serverClient) => {
    try {
      const remoteClient = net.connect(port, host);
      serverClient.pipe(remoteClient);
      remoteClient.pipe(serverClient);
      serverClient.on('error', () => {
        remoteClient.end();
      });
      remoteClient.on('error', () => {
        serverClient.end();
      });
    } catch (error) { console.error(error); }
  });
  server.on('error', (error) => { console.error(error); });
  server.listen(serverPort, () => {
    console.log(`portBindCS ${JSON.stringify(Object.values(arguments))} ...`);
  });
}

/**
 * Create SocketIO Server
 * @param port
 * @param host
 */
export const createServer = async (port: number = opts.port, host: string = opts.host): Promise<void> => {
  let proxyUrl = 'http://10.10.222.240:80';

  if (proxyUrl) {
    const proxyMiddleware = createProxyMiddleware({
      target: proxyUrl,
      changeOrigin: true,
      cookieDomainRewrite: '',
      ws: true,
    });
    const server = http.createServer(proxyMiddleware);
    server.listen(port, () => {
      Logger.info(`Proxy ${proxyUrl} on ${port} ...`);
    });
    return;
  }
  const server = http.createServer();
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    maxHttpBufferSize: 1024 * 1024 * 512,
    transports: ['websocket'],
    pingTimeout: 90 * 1000,
    pingInterval: 60 * 1000,
  });
  try {
    server.listen(port, () => {
      Logger.info(`listening ws on ${host}:${port}`);
      Promise.resolve();
    });
    server.on('error', (err: any) => {
      Logger.error(err.message);
      Logger.error('server exit.');
      process.exit(1);
    });
  } catch (e) {
    Logger.error(e.message);
    Logger.error('server exit.');
    process.exit(1);
  }

  if (false && opts.token) {
    io.use((socket, next) => {
      if (socket.handshake.auth && socket.handshake.auth.token && opts.token === socket.handshake.auth.token) {
        return next();
      }
      Logger.warn('client %s authentication failed, ip=%s', socket.id, socket.handshake.address);
      next(new Error('Invalid authentication'));
      setTimeout(() => {
        socket.disconnect();
      }, 1000);
    });
  } else {
    Logger.warn('***** No security token, disable authentication, very dangerous, please use --token [security token] *****');
  }

  io.on('connection', (client: Socket) => {
    const instance = new ClientEvent(client, {
      dispatch,
      online,
    });
  });
};
