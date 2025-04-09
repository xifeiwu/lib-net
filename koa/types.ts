import Koa from 'koa';
import {Socket} from 'net';
import http from 'http';
import WebSocket from 'ws';
import session from 'koa-session';
import {NormalizedUrlProps, HttpBodyParserOptions, SocksServerConfigPerVersion} from '../service/external';
import {StaticMiddlewareOptions} from './middleware/static';
import {IncomingMessage} from 'http';
import {CorsMWOptions} from './middleware/cors';
import {LogsMWOptions} from './middleware/logs';
import {LogMWOptions} from './middleware/log';

export {StaticMiddlewareOptions};
export interface SpaDirInfo {
  fullpath: string;
  entries: string[];
}

export interface StaticMWConfig {
  dirList?: string[];
  spaDirList?: SpaDirInfo[];
  mwOptions?: StaticMiddlewareOptions;
}

export interface KoaMiddlewareConfig {
  /** http middleware config */
  // useErrorCatchMW?: boolean;
  logMWOptions?: LogMWOptions;
  useDebugMW?: boolean;
  corsWMOptions?: CorsMWOptions;
  logsMWOptions?: LogsMWOptions;
  useForumMW?: boolean;
  staticWMConfig?: StaticMWConfig;
  socksConfig?: Partial<SocksServerConfigPerVersion>;
}

export interface KoaConfig {
  host?: string;
  port?: number;
  /** whether print server's origin or not */
  printOrigin?: boolean | string | object;
  keys?: string[];
  /** config for koa-session */
  sessionOptions?: Partial<session.opts>;
  /** bodyParserOptions is a bodyParser's config and will be added to Koa.Context, it's not a Koa middlware */
  bodyParserOptions?: HttpBodyParserOptions;
  /** Take case: the sequence of middleware is setted by key sequence of KoaConfig */
  /** middlewares to handle http request event */
  requestMiddlewares?: Array<Koa.Middleware>;
  /** middlewares to handle http upgrade event */
  upgradeMiddlewares?: UpgradeMiddleware[];
  /** config for pre-defined koa-middleware, such as debug, cors, logs, forum, static */
  mwConfig?: KoaMiddlewareConfig;
}

/**
 * Short cut config for quick config
 */
export interface KoaShortCutConfig {
  staticDir?: string | string[];
  uploadDir?: string;
}

export interface Ctx4Upgrade {
  req: IncomingMessage;
  socket: Socket;
  head: Buffer;
  urlProps: NormalizedUrlProps;
  protocol: string;
  ws?: WebSocket;
}
export type UpgradeMiddleware = (ctx: Ctx4Upgrade, next) => Promise<void>;

export interface KoaServerInfo {
  origin: string;
  host: string;
  port: number;
  server: http.Server;
  app: Koa;
  koaConfig: KoaConfig;
}
