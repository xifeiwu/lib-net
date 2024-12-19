import {IncomingMessage} from 'http';
import {Socket} from 'net';
import compose from 'koa-compose';
import {httpResponseInfoToBuffer, toUrlProps} from '../service/external';
import {Ctx4Upgrade, UpgradeMiddleware} from './types';
import {getUpgradeProtocol} from '../../node';

const NotFoundMiddleware = (ctx: Ctx4Upgrade, next) => {
  const {req, socket} = ctx;
  const {url} = req;
  const protocol = getUpgradeProtocol(req);
  const data = Buffer.from(`Not found upgrade handler for protocol[${protocol}], url[${url}]`);
  socket.end(
    httpResponseInfoToBuffer({
      statusCode: 404,
      statusMessage: 'Not Found',
      headers: {
        'content-length': String(data.byteLength),
      },
      data,
    })
  );
};

export function getUpgradeHandler(middlewareList: UpgradeMiddleware[]) {
  const fn = compose([...middlewareList, NotFoundMiddleware]);
  async function handleUpgrade(req: IncomingMessage, socket: Socket, head: Buffer) {
    const protocol = getUpgradeProtocol(req);
    const urlProps = toUrlProps(req.url);
    const ctx: Ctx4Upgrade = {req, socket, head, protocol: protocol.toLowerCase(), urlProps};
    await fn(ctx);
  }
  return handleUpgrade;
}
