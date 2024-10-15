import {KoaServerInfo, startKoaServer} from '../koa';
import {TcpGateWayConfig, TcpHandlerMiddleware} from './types';
import {HttpHandler, startSocketClient, startTcpProxyServer, TcpHandler} from '../external';
import {getTcpHandlerMiddleware as getTcpHandlerMw4Socks} from '../koa/middleware/socks/index';
import {getTcpHandler} from './service';

export async function startTcpGateWay(options?: TcpGateWayConfig) {
  const {tcpServerConfig, mwConfig, middlewares = [], koa} = options ?? {};
  let httpHandler: HttpHandler;
  let koaServerInfo: KoaServerInfo;
  if (koa) {
    koaServerInfo = await startKoaServer(koa.config, koa.shortCut);
    httpHandler = async socket => {
      const {host, port} = koaServerInfo;
      const proxyClient = await startSocketClient({host, port});
      socket.pipe(proxyClient).pipe(socket);
    };
  }
  let tcpHandler: TcpHandler;
  const middlewareList: TcpHandlerMiddleware[] = [...middlewares];
  const {socksConfig: socksConfig} = mwConfig ?? {};
  socksConfig && middlewareList.push(getTcpHandlerMw4Socks(socksConfig));
  if (middlewareList.length > 0) {
    tcpHandler = getTcpHandler(middlewareList);
  }
  const {host, port, server} = await startTcpProxyServer(
    {
      httpHandler,
      tcpHandler,
    },
    {
      ...tcpServerConfig,
    }
  );
  return {host, port, server, koaServerInfo};
}
