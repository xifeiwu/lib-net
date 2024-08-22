import Koa from 'koa';
import {Socket} from 'net';
import WebSocket from 'ws';
import session from 'koa-session';
import {ParserOptions} from '../external';
import {StaticMiddlewareOptions} from './static';
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
  /** whether print origin of server or not */
  printOrigin?: boolean;
  keys?: string[];
  sessionOptions?: Partial<session.opts>;
  /** bodyParserOptions is a config will adde to Koa.Context, it's not a Koa middlware */
  bodyParserOptions?: ParserOptions;
  middlewareList?: Array<Koa.Middleware>;
  wsMiddlewareList?: WsMiddleware[];
  mwConfig?: KoaMiddlewareConfig;
}

export interface Ctx4Upgrade {
  req: IncomingMessage;
  socket: Socket;
  head: Buffer;
  ws?: WebSocket;
}
export type WsMiddleware = (ctx: Ctx4Upgrade, next) => Promise<void>;
