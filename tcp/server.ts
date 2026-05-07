import {KoaServerInfo, startKoaServer} from '../koa';
import {TcpGateWayConfig, TcpHandlerMiddleware} from './types';
import {startTcpGateway, TcpHandler} from '../service/external';
import {getSocksTcpMw as getTcpHandlerMw4Socks} from '../koa/middleware/socks/index';
import {getAssetsTcpMw} from '../koa/middleware/assets/index';
import {getTcpHandler} from './service';

export async function startCustomizedTcpGateway(options?: TcpGateWayConfig) {
  const {tcpServerConfig, mwConfig, middlewares = [], koa, assetsSyncUp} = options ?? {};
  let koaServerInfo: KoaServerInfo;
  if (koa) {
    koaServerInfo = await startKoaServer(koa.config, koa.shortCut);
  }
  let tcpHandler: TcpHandler;
  const middlewareList: TcpHandlerMiddleware[] = [...middlewares];
  const {socksConfig} = mwConfig ?? {};
  socksConfig && middlewareList.push(getTcpHandlerMw4Socks(socksConfig));
  assetsSyncUp && middlewareList.push(getAssetsTcpMw(assetsSyncUp));
  if (middlewareList.length > 0) {
    tcpHandler = getTcpHandler(middlewareList);
  }
  const {host, port, server} = await startTcpGateway(
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
