import WebSocket, {WebSocketServer} from 'ws';
import {wsPrefix} from './service';
import {uuid, toUrlProps, CanConvertToBuffer, toBuffer} from '../../../external';
import {WsMiddleware} from '../../types';

export const path4Broadcast = `${wsPrefix}/broadcast`;

const wss = new WebSocketServer({noServer: true, clientTracking: false});

wss.on('wsClientError', err => {
  console.log(err);
});

export const wsMap = new Map<string, WebSocket>();

export function broadcastData(data: CanConvertToBuffer) {
  for (const ws of wsMap.values()) {
    ws.send(toBuffer(data));
  }
}

export function wsConnections() {
  const connections = [...wsMap.keys()];
  return connections;
}

export const upgradeMiddelware: WsMiddleware = async (ctx, next) => {
  const {req, socket, head} = ctx;
  const {url} = req;
  const {pathname} = toUrlProps(url);
  if (pathname === path4Broadcast) {
    wss.handleUpgrade(req, socket, head, ws => {
      // wss.emit('connection', ws, req);
      ctx.ws = ws;
      const {remoteAddress, remotePort} = socket;
      let key = uuid();
      if (remoteAddress !== undefined && remotePort !== undefined) {
        key = remoteAddress + ':' + remotePort;
      }
      if (wsMap.has(key)) {
        throw new Error(`${key} already existed.`);
      }
      wsMap.set(key, ws);
      ws.on('message', (data, isBinary) => {
        broadcastData(data);
      });
      ws.on('close', () => {
        wsMap.delete(key);
      });
    });
  } else {
    await next();
  }
};
