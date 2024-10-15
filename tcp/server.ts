import {Socket} from 'net';
import {startKoaServer} from '../koa';
import {TcpGateWayConfig, TcpHandlerMiddleware} from './types';
import {startSocketClient, startTcpProxyServer} from '../external';
import {getTcpHandlerMiddleware as getTcpHandlerMw4Socks} from '../koa/middleware/socks/index';
import {getTcpHandler} from './service';

export async function startTcpGateWay(options?: TcpGateWayConfig) {
  const {tcpServerConfig, mwConfig, koaConfig, koaShortCutConfig} = options ?? {};
  const koaServerInfo = await startKoaServer(koaConfig, koaShortCutConfig);
  async function httpHandler(socket: Socket) {
    const {host, port} = koaServerInfo;
    const proxyClient = await startSocketClient({host, port});
    socket.pipe(proxyClient).pipe(socket);
  }
  const middlewareList: TcpHandlerMiddleware[] = [];
  const {socksConfig} = mwConfig ?? {};
  socksConfig && middlewareList.push(getTcpHandlerMw4Socks(socksConfig));
  const tcpHandler = getTcpHandler(middlewareList);

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
