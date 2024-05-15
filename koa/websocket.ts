import {IncomingMessage} from 'http';
import {Socket} from 'net';
import compose from 'koa-compose';
import {HttpRequestInfo, getRequestInfo, responseInfoToBuffer} from '../external';

export interface Ctx4Upgrade {
  req: IncomingMessage;
  socket: Socket;
  head: Buffer;
}

export type WsMiddleware = (ctx: Ctx4Upgrade, next) => Promise<void>;

export function getUpgradeHandler(middlewareList: WsMiddleware[]) {
  const fn = compose(middlewareList);
  async function handleUpgrade(req: IncomingMessage, socket: Socket, head: Buffer) {
    const requestInfo = await getRequestInfo(req);
    const ctx: Ctx4Upgrade = {req, socket, head};
    await fn(ctx);
    const data = Buffer.from(`no handler found for url: ${requestInfo.url}`);
    socket.end(
      responseInfoToBuffer({
        statusCode: 400,
        statusMessage: 'Not Found',
        headers: {
          'content-length': String(data.byteLength),
        },
        data,
      })
    );
  }
  return handleUpgrade;
}
