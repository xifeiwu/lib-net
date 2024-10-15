import {Socket} from 'net';
import {Protocol, SocksServerConfigPerVersion, TcpServerConfig} from '../external';
import {KoaConfig, KoaShortCutConfig} from '../koa';

export interface Ctx4TcpHandler {
  protocol: Protocol;
  socket: Socket;
}

export type TcpHandlerMiddleware = (ctx: Ctx4TcpHandler, next) => Promise<void>;

export interface TcpHandlerMiddlewareConfig {
  socks: Partial<SocksServerConfigPerVersion>;
}


export interface TcpGateWayConfig {
  tcpServerConfig?: TcpServerConfig;
  middlewares?: TcpHandlerMiddleware[]
  mwConfig?: TcpHandlerMiddlewareConfig;
  koa?: {
    config?: KoaConfig;
    shortCut?: KoaShortCutConfig;
  }
}
