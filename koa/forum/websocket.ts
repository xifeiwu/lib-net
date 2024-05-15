import http from 'http';
import stream from 'stream';
import {WebSocketServer} from 'ws';
import {parse} from 'url';
import {wsPrefix} from './service';
import {WsMiddleware} from '../websocket';
import {uuid} from '../../external';

const wss = new WebSocketServer({noServer: true, clientTracking: false});

export const wsPath = `${wsPrefix}/notifications`;
export function handleUpgrade(req: http.IncomingMessage, socket: stream.Duplex, head: Buffer) {
  const {pathname} = parse(req.url);
  if (pathname === wsPath) {
    wss.handleUpgrade(req, socket, head, ws => {
      wss.emit('connection', ws, req);
    });
  }
}

wss.on('wsClientError', err => {
  console.log(err);
});
export const websocketMap = new Map();
export const forumWsMiddleware: WsMiddleware = async (ctx, next) => {
  const {req, socket, head} = ctx;
  const {url} = req;
  const {pathname} = parse(url);
  if (pathname === wsPath) {
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
