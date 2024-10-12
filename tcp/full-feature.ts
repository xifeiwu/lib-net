import {Socket} from 'net';
import KoaRouter from 'koa-router';
import {
  getConnectionHandler,
  MemcachedStore,
  PORT,
  startSocketClient,
  startRedirectSocketServer,
} from '../external';
import {KoaConfig, KoaShortCutConfig, localKoaConfig, serializeKoaConfig, startKoaServer} from '../koa';
import {customDeepMerge, TcpServerConfig} from '../../node';

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

const customizeDeepMerge = customDeepMerge({mergeArraySolution: 'concat'});
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
    localKoaConfig,
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
  const {host, port, server} = await startRedirectSocketServer(
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
