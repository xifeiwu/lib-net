import {KoaServerInfo, startKoaServer} from '../koa';
import {TcpGateWayConfig, TcpHandlerMiddleware} from './types';
import {startTcpServerAsGateway, TcpHandler} from '../service/external';
import {getSocksTcpMw, getAssetsTcpMw} from '../koa/middleware';
import {getTcpHandler} from './service';

export async function startCustomizedTcpGateway(options?: TcpGateWayConfig) {
  const {tcpServerConfig, mwConfig, middlewares = [], koa} = options ?? {};
  let koaServerInfo: KoaServerInfo;
  if (koa) {
    koaServerInfo = await startKoaServer(koa.config, koa.shortCut);
  }
  let tcpHandler: TcpHandler;
  const middlewareList: TcpHandlerMiddleware[] = [...middlewares];
  const {socks, assetsSyncUp} = mwConfig ?? {};
  socks && middlewareList.push(getSocksTcpMw(socks));
  assetsSyncUp && middlewareList.push(getAssetsTcpMw(assetsSyncUp));
  if (middlewareList.length > 0) {
    tcpHandler = getTcpHandler(middlewareList);
  }
  const {host, port, server} = await startTcpServerAsGateway(
    {
      redirectByProtocol: koaServerInfo
        ? {
            http: koaServerInfo,
          }
        : undefined,
      handleConnection: tcpHandler,
    },
    {
      ...tcpServerConfig,
    }
  );
  return {host, port, server, koaServerInfo};
}
