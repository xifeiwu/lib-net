import {Socket} from 'net';
import KoaRouter from 'koa-router';
import {
  getConnectionHandlerToMemcached,
  MemcachedStore,
  startSocketClient,
  startTcpGateway,
  customDeepMerge,
  TcpServerConfig,
} from '../service/external';
import {KoaConfig, KoaShortCutConfig, DEFAULT_KOA_CONFIG, serializeKoaConfig, startKoaServer} from '../koa';

const store = new MemcachedStore();
const memcachedHandler = getConnectionHandlerToMemcached(store);
async function tcpHandler(socket: Socket, info) {
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

const customizeDeepMerge = customDeepMerge();
/**
 * Start a tcp server that can handle any kinds of request, include http, memcached, ...
 */
export async function startLocalFullFeatureServer(options: {
  koaConfig?: KoaConfig;
  koaShortCutConfig?: KoaShortCutConfig;
  tcpServerConfig?: TcpServerConfig;
}) {
  const {koaConfig, koaShortCutConfig, tcpServerConfig} = options ?? {};
  const mergedKoaConfig = customizeDeepMerge<KoaConfig, KoaConfig, KoaConfig>(
    DEFAULT_KOA_CONFIG,
    {
      requestMiddlewares: [getMemcachedMw()],
    },
    koaConfig ?? {}
  );
  const koaServerInfo = await startKoaServer(mergedKoaConfig, koaShortCutConfig);
  async function httpHandler(socket: Socket) {
    const {host, port} = koaServerInfo;
    const proxyClient = await startSocketClient({host, port});
    socket.pipe(proxyClient).pipe(socket);
  }
  const {host, port, server} = await startTcpGateway(
    {
      httpHandler,
      tcpHandler,
    },
    {
      ...tcpServerConfig,
    }
  );
  return {host, port, server, koaConfig: serializeKoaConfig(koaServerInfo.koaConfig)};
}
