import WebSocket, {WebSocketServer} from 'ws';
import {WS_PATH} from './service';
import {uuid} from '../../../service/external';
import {UpgradeMiddleware} from '../../types';

const wss = new WebSocketServer({noServer: true, clientTracking: false});

wss.on('wsClientError', err => {
  console.log(err);
});

export const websocketMap = new Map<string, WebSocket>();

export const forumHttpUpgradeMw: UpgradeMiddleware = async (ctx, next) => {
  const {
    req,
    socket,
    head,
    protocol,
    urlProps: {pathname},
  } = ctx;
  if (pathname === WS_PATH.notifications && protocol === 'websocket') {
    wss.handleUpgrade(req, socket, head, ws => {
      wss.emit('connection', ws, req);
      ctx.ws = ws;
      const {remoteAddress, remotePort} = socket;
      let key = uuid();
      if (remoteAddress !== undefined && remotePort !== undefined) {
        key = remoteAddress + ':' + remotePort;
      }
      if (websocketMap.has(key)) {
        throw new Error(`${key} already existed.`);
      }
      websocketMap.set(key, ws);
      ws.on('close', () => {
        websocketMap.delete(key);
      });
    });
  } else {
    await next();
  }
};
