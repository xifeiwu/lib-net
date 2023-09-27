import http from 'http';
import stream from 'stream';
import {WebSocketServer} from 'ws';
import {parse} from 'url';
import {prefix} from './service';
export const wss = new WebSocketServer({noServer: true});

const wsPath = `${prefix}/ws/notifications`;
export function handleUpgrade(req: http.IncomingMessage, socket: stream.Duplex, head: Buffer) {
  const {pathname} = parse(req.url);
  if (pathname === wsPath) {
    wss.handleUpgrade(req, socket, head, ws => {
      wss.emit('connection', ws, req);
    });
  }
}
