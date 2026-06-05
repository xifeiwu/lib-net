import net from 'net';
import tls from 'tls';
import {KoaServerInfo, startKoaServer} from '../koa';
import {AssistServiceConfig, TcpHandlerMiddleware} from './types';
import {startTcpConnectionRouter, TcpHandler, TcpServerConfig} from '../service/external';
import {getSocksTcpMw, getAssetsTcpMw} from '../koa/middleware';
import {getTcpHandler} from './service';
import {RouteTcpConnectionOptions} from '../../node/utils/tcp-gateway/types';

export async function getRouteTcpConnectionOptions(options?: AssistServiceConfig) {
  const {tcp, koa} = options ?? {};
  const {middlewares = [], mwConfig} = tcp ?? {};
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
  const result: RouteTcpConnectionOptions = {
    router: koaServerInfo
      ? {
          http: koaServerInfo,
        }
      : undefined,
    tcpHandler,
  };
  return {routeTcpOptions: result, koaServerInfo};
}

export async function startTcpGateway(options?: AssistServiceConfig) {
  const {routeTcpOptions, koaServerInfo} = await getRouteTcpConnectionOptions(options);
  const gateway: Array<{host: string; port: number; server: net.Server | tls.Server}> = [];
  if (Array.isArray(options?.gateway)) {
    for (const serverConfig of options.gateway) {
      const {host, port, server} = await startTcpConnectionRouter(routeTcpOptions, serverConfig);
      gateway.push({host, port, server});
    }
  } else {
    gateway.push(await startTcpConnectionRouter(routeTcpOptions));
  }
  return {gateway, koaServerInfo};
}
