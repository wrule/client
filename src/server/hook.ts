import { Socket, Server } from 'socket.io';

export
interface SocketExt extends Socket {
  _clientOn: Socket['on'];
  _clientEmit: Socket['emit'];
}

export
interface HookData {
  clientId: string;
  clientAddress: string;
  type: string;
  ev: string;
  args: any[];
}

export
interface EmitData {
  ev: string;
  args: any[];
}

export
function hookClient(
  client: Socket,
  io: Server,
  onForward?: (data: HookData, client: SocketExt, io: Server) => any,
  emitForward?: (data: HookData, client: SocketExt, io: Server) => any,
) {
  const clientExt = client as SocketExt;
  clientExt._clientOn = clientExt.on;
  clientExt._clientEmit = clientExt.emit;

  clientExt._clientOn('joinRoom', (roomName) => {
    clientExt.join(roomName);
  });
  clientExt._clientOn('leaveRoom', (roomName) => {
    clientExt.leave(roomName);
  });

  clientExt.on = (ev: string, listener: (...args: any[]) => void) => {
    return clientExt._clientOn(ev, (...args: any[]) => {
      const hookData = {
        clientId: clientExt.id,
        clientAddress: clientExt.handshake.address,
        type: '_clientOn', ev, args,
      };
      try {
        io.to('hookBroadcast').emit('broadcast', hookData);
      } catch (error) {
        console.error(error);
      }
      try {
        if (onForward && onForward(hookData, clientExt, io)) return;
      } catch (error) {
        console.error(error);
      }
      return listener(...args);
    }) as SocketExt;
  };

  clientExt.emit = (ev: string, ...args: any[]) => {
    const hookData = {
      clientId: clientExt.id,
      clientAddress: clientExt.handshake.address,
      type: '_clientEmit', ev, args,
    };
    try {
      io.to('hookBroadcast').emit('broadcast', hookData);
    } catch (error) {
      console.error(error);
    }
    try {
      if (emitForward && emitForward(hookData, clientExt, io)) return true;
    } catch (error) {
      console.error(error);
    }
    return clientExt._clientEmit(ev, ...args);
  };
}
