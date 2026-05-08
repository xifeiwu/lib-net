import {Socket} from 'net';
import {Protocol, SocksServerConfigPerVersion, TcpServerConfig} from '../service/external';
import {KoaConfig, KoaShortCutConfig} from '../koa';

export interface Ctx4TcpHandler {
  protocol: Protocol;
  socket: Socket;
}

export type TcpHandlerMiddleware = (ctx: Ctx4TcpHandler, next) => Promise<void>;

export interface AssetsSyncUpConfig {
  dir: string;
  git?: string;
}

export interface TcpHandlerMiddlewareConfig {
  socks: Partial<SocksServerConfigPerVersion>;
  assetsSyncUp?: AssetsSyncUpConfig;
}

export interface TcpGateWayConfig {
  tcpServerConfig?: TcpServerConfig;
  middlewares?: TcpHandlerMiddleware[];
  mwConfig?: TcpHandlerMiddlewareConfig;
  koa?: {
    config?: KoaConfig;
    shortCut?: KoaShortCutConfig;
  };
}
