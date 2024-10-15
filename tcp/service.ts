import {PORT, TcpHandler, TcpServerConfig} from '../external';
import compose from 'koa-compose';
import {Ctx4TcpHandler, TcpGateWayConfig, TcpHandlerMiddleware} from './types';
import {SOCKS_SERVER_CONFIG} from '../koa/middleware/socks/service';
import {KOA_CONFIG, serializeKoaConfig} from '../koa';

export const localTcpServerConfig: TcpServerConfig = {
  port: PORT.fullFeatureTcpServer.port,
  host: '127.0.0.1',
};

const NoHandleMiddleware = (ctx: Ctx4TcpHandler, next) => {
  return false;
};

export function getTcpHandler(middlewareList: TcpHandlerMiddleware[]): TcpHandler {
  const fn = compose([...middlewareList, NoHandleMiddleware]);
  const tcpHandler: TcpHandler = async (socket, {protocol, firstChunk}) => {
    const ctx: Ctx4TcpHandler = {socket, protocol};
    return await fn(ctx);
  };
  return tcpHandler;
}

export const TCP_GATEWAY_CONFIG: TcpGateWayConfig = {
  tcpServerConfig: localTcpServerConfig,
  mwConfig: {socksConfig: SOCKS_SERVER_CONFIG},
  middlewares: [],
  koa: {
    config: KOA_CONFIG,
  },
};

export function serializeTcpGatewayConfig(config: TcpGateWayConfig) {
  const {tcpServerConfig, mwConfig, middlewares, koa} = config;
  const {config: koaConfig, shortCut} = koa;

  return {
    tcpServerConfig,
    mwConfig,
    middlewares,
    koa: {
      config: serializeKoaConfig(koaConfig),
      shortCut,
    },
  };
}
