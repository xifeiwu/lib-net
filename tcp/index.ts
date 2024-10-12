import {Socket} from 'net';
import KoaRouter from 'koa-router';
import {
  getConnectionHandler,
  MemcachedStore,
  PORT,
  startSocketClient,
  startRedirectSocketServer,
} from '../external';
import {KoaConfig, KoaShortCutConfig, localFullFeatureKoaConfig, startKoaServer} from '../koa/middleware';
import {TcpServerConfig} from '../../node';

const store = new MemcachedStore();
const memcachedHandler = getConnectionHandler(store);
function tcpHandler(socket: Socket, firstChunk?: Buffer) {
  memcachedHandler(socket);
}

function getMemcachedMw() {
  const router = new KoaRouter({
    prefix: '/api/memcached',
  });
  router.get('/list', async (ctx, next) => {
    ctx.body = store.toJSON();
  });
  return router.routes();
}
/**
 * Start a tcp server that can handle any kinds of request, include http, memcached, ...
 */
export async function startSyntheticTcpServer(options: {
  koaConfig?: KoaConfig;
  koaShortCutConfig?: KoaShortCutConfig;
  tcpServerConfig?: TcpServerConfig;
}) {
  const {koaConfig = localFullFeatureKoaConfig, koaShortCutConfig, tcpServerConfig} = options ?? {};
  const httpServerInfo = await startKoaServer(
    {
      ...koaConfig,
      middlewareList: [getMemcachedMw()],
    },
    koaShortCutConfig
  );
  async function httpHandler(socket: Socket) {
    const {host, port} = httpServerInfo;
    const proxyClient = await startSocketClient({host, port});
    socket.pipe(proxyClient).pipe(socket);
  }
  const {host, port, server} = await startRedirectSocketServer(
    {
      httpHandler,
      tcpHandler,
    },
    {
      // port: PORT.fullFeatureTcpServer.port,
      ...tcpServerConfig,
    }
  );
  return {host, port, server};
}
