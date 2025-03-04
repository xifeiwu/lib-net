import WebSocket, {WebSocketServer} from 'ws';
import {WS_PATH, wsPrefix} from './service';
import {
  uuid,
  CanConvertToBuffer,
  convertToBuffer,
  httpResponseInfoToBuffer,
  getUpgradeResponse,
  writeability,
} from '../../../service/external';
import {UpgradeMiddleware} from '../../types';

export const path4Broadcast = `${wsPrefix}/broadcast`;

const wss = new WebSocketServer({noServer: true, clientTracking: false});

wss.on('wsClientError', err => {
  console.log(err);
});

export const wsMap = new Map<string, WebSocket>();

export function broadcastData(data: CanConvertToBuffer) {
  for (const ws of wsMap.values()) {
    ws.send(convertToBuffer(data));
  }
}

export function wsConnections() {
  const connections = [...wsMap.keys()];
  return connections;
}

export const upgradeMiddelware: UpgradeMiddleware = async (ctx, next) => {
  const {
    req,
    socket,
    head,
    protocol,
    urlProps: {pathname},
  } = ctx;
  /**
   * Echo original data send from client side for debug
   * It's better list this middleware ahead of other middlewares
   */
  if (pathname === WS_PATH.echo) {
    socket.write(httpResponseInfoToBuffer(getUpgradeResponse(protocol)));
    socket.on('data', chunk => {
      if (socket.writable) {
        socket.write(chunk);
      }
    });
  } else if (pathname === WS_PATH.netSpeedUpload) {
    socket.write(httpResponseInfoToBuffer(getUpgradeResponse(protocol)));
    let size = 0;
    socket.on('data', chunk => {
      size += chunk.byteLength;
    });
    socket.on('end', () => {
      socket.end(size.toString(16));
    });
  } else if (pathname === WS_PATH.netSpeedDownload) {
    socket.write(httpResponseInfoToBuffer(getUpgradeResponse(protocol)));
    writeability(socket, {maxSize: '512M'});
  } else if (pathname === WS_PATH.broadcast && protocol === 'websocket') {
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
