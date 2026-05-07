import {Socket} from 'net';
import {Protocol, SocksServerConfigPerVersion, TcpServerConfig} from '../service/external';
import {KoaConfig, KoaShortCutConfig} from '../koa';

export interface Ctx4TcpHandler {
  protocol: Protocol;
  socket: Socket;
}

export type TcpHandlerMiddleware = (ctx: Ctx4TcpHandler, next) => Promise<void>;

export interface TcpHandlerMiddlewareConfig {
  socksConfig: Partial<SocksServerConfigPerVersion>;
}

export interface AssetsSyncUpConfig {
  dir: string;
  git?: string;
}

export interface TcpGateWayConfig {
  tcpServerConfig?: TcpServerConfig;
  middlewares?: TcpHandlerMiddleware[];
  mwConfig?: TcpHandlerMiddlewareConfig;
  assetsSyncUp?: AssetsSyncUpConfig;
  koa?: {
    config?: KoaConfig;
    shortCut?: KoaShortCutConfig;
  };
}
