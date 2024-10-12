import Koa from 'koa';
import {Socket} from 'net';
import WebSocket from 'ws';
import session from 'koa-session';
import {ParserOptions} from '../external';
import {StaticMiddlewareOptions} from './middleware/static';
import {IncomingMessage} from 'http';
import {CorsMWOptions} from './middleware/cors';
import {LogsMWOptions} from './middleware/logs';
import {LogMWOptions} from './middleware/log';

export {StaticMiddlewareOptions} from './static';

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
}

export interface KoaConfig {
  host?: string;
  port?: number;
  /** whether print server's origin or not */
  printOrigin?: boolean;
  keys?: string[];
  /** config for koa-session */
  sessionOptions?: Partial<session.opts>;
  /** bodyParserOptions is a bodyParser's config and will be added to Koa.Context, it's not a Koa middlware */
  bodyParserOptions?: ParserOptions;
  /** koa middleware passed by user, they will be list at front part of middleware list */
  middlewareList?: Array<Koa.Middleware>;
  wsMiddlewareList?: WsMiddleware[];
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
  ws?: WebSocket;
}
export type WsMiddleware = (ctx: Ctx4Upgrade, next) => Promise<void>;
