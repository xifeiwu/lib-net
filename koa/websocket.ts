import {IncomingMessage} from 'http';
import {Socket} from 'net';
import compose from 'koa-compose';
import {responseInfoToBuffer} from '../external';
import {Ctx4Upgrade} from './types';

/**
 * @deprecated by WsMiddleware in types.ts
 */
export type WsMiddleware = (ctx: Ctx4Upgrade, next) => Promise<void>;

const NotFoundMiddleware = (ctx: Ctx4Upgrade, next) => {
  const {
    req: {url},
    socket,
  } = ctx;
  const data = Buffer.from(`no handler found for url: ${url}`);
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
};

export function getUpgradeHandler(middlewareList: WsMiddleware[]) {
  const fn = compose([...middlewareList, NotFoundMiddleware]);
  async function handleUpgrade(req: IncomingMessage, socket: Socket, head: Buffer) {
    const ctx: Ctx4Upgrade = {req, socket, head};
    await fn(ctx);
  }
  return handleUpgrade;
}
