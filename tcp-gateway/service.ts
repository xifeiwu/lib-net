import {PORT, TcpHandler} from '../service/external';
import compose from 'koa-compose';
import {Ctx4TcpHandler, AssistServiceConfig, TcpHandlerMiddleware} from './types';
import {SOCKS_SERVER_CONFIG} from '../koa/middleware/socks/service';
import {DEFAULT_KOA_CONFIG, KoaServerInfo, serializeKoaConfig} from '../koa';

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

/**
 * A default assist server config contains some default config,
 * to avoid duplicate config in different environment.
 */
export const ASSIST_SERVER_DEFAULT_CONFIG: AssistServiceConfig = {
  tcp: {
    mwConfig: {socks: SOCKS_SERVER_CONFIG},
    middlewares: [],
  },
  koa: {
    config: DEFAULT_KOA_CONFIG,
    shortCut: {},
  },
};

export function serializeTcpGatewayConfig(config: AssistServiceConfig) {
  const {gateway, tcp, koa} = config;
  const {config: koaConfig, shortCut} = koa;
  return {
    gateway,
    tcp,
    koa: {
      config: serializeKoaConfig(koaConfig),
      shortCut,
    },
  };
}

export function serializeTcpGatewayInfo(info: {
  config: AssistServiceConfig;
  gateway: Array<{host: string; port: number; description?: string}>;
  koaServerInfo: KoaServerInfo;
}) {
  const {config, gateway, koaServerInfo} = info;
  const result = {
    config: serializeTcpGatewayConfig(config),
    tcpServer: gateway.map(item => {
      const {host, port, description} = item;
      const info: {host: string; port: number; description?: string} = {
        host,
        port,
      };
      if (description) {
        info.description = description;
      }
      return info;
    }),
    httpServer: [koaServerInfo].map(item => {
      const {origin} = item;
      const url = new URL(item.origin);
      const info: {origin: string; description?: string; viaTcp?: string} = {
        origin: origin,
      };
      if (gateway.length > 0) {
        url.port = gateway[0]?.port?.toString() ?? '';
        info.viaTcp = url.origin;
      }
      return info;
    }),
  };
  return result;
}
