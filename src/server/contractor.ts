import { Server } from 'socket.io';
import { EmitData, HookData, SocketExt } from './hook';
import { io, Socket as ClientSocket } from 'socket.io-client';
import QueueMap from './queueMap';
import path from 'path';
import xconfig from '@/xconfig';

let attachUrl = xconfig.attachUrl;
let attachEnvName = xconfig.attachEnvName;
const triggerUrl = 'http://127.0.0.1:6419';
const isAttachMode = !!(attachUrl && attachEnvName);

export
class Contractor {
  public constructor() {
    if (isAttachMode) {
      this.trigger = io(triggerUrl);
      this.attacher = io(attachUrl);
      this.trigger.on('connect', () => {
        console.log(`Contractor Trigger connected ${triggerUrl}`);
      });
      this.trigger.onAny((ev, ...args) => {
        this.attacher.emit('helpToEmit', { ev, args });
      });
      this.attacher.on('connect', () => {
        console.log(`Contractor Attacher connected ${attachUrl}`);
        this.Attach(attachEnvName);
        console.log(`Contractor Attacher attach to env ${attachEnvName}`);
      });
      this.attacher.on('broadcast', (data) => {
        this.trigger.emit(data.ev, ...data.args);
      });
    }
  }

  private trigger!: ClientSocket;
  private attacher!: ClientSocket;
  private queueMap = new QueueMap<string, {
    envName: string;
    clientId: string;
  }>(1e5);

  public onForward(data: HookData, client: SocketExt, io: Server) {
    const params = data.args[0] ?? { };
    const requestId: string = params.requestId;
    if (requestId) {
      let envName = (params.envName ?? params.data?.env?.name ?? this.queueMap.get(requestId)?.envName);
      if (envName) {
        const roomName = `room-${envName}`;
        const targetRoom = io.sockets.adapter.rooms.get(roomName);
        if (targetRoom && targetRoom.size > 0) {
          this.queueMap.set(requestId, { envName, clientId: client.id });
          return io.to(roomName).emit('broadcast', data);
        }
      }
    }
  }

  public emitForward(data: HookData, client: SocketExt, io: Server) {
    const params = data.args[0] ?? { };
    const requestId: string = params.requestId;
    if (requestId) {

    }
  }

  public HelpToEmit(clientExt: SocketExt, io: Server) {
    clientExt._clientOn('helpToEmit', (data: EmitData) => {
      const params = data.args[0] ?? { };
      const requestId: string = params.requestId;
      if (requestId) {
        const clientId = this.queueMap.get(requestId)?.clientId;
        if (clientId) {
          const targetClient = io.sockets.sockets.get(clientId) as SocketExt;
          targetClient?._clientEmit(data.ev, ...data.args);
        }
      }
    });
  }

  public Attach(envName: string) {
    this.attacher.emit('joinRoom', `room-${envName}`);
  }

  public Detach(envName: string) {
    this.attacher.emit('leaveRoom', `room-${envName}`);
  }
}

const contractor = new Contractor();
export default contractor;
