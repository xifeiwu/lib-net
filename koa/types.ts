import {ParserOptions} from '../external';
import {StaticMiddlewareOptions} from './static';
import session from 'koa-session';
import {IncomingMessage} from 'http';
import {Socket} from 'net';
import WebSocket from 'ws';
import {CorsMWOptions} from './middleware/cors';
import {LogsMWOptions} from './middleware/logs';

export interface SpaDirInfo {
  fullpath: string;
  entries: string[];
}

export interface StaticMWConfig {
  dirList?: string[];
  spaDirList?: SpaDirInfo[];
  mwOptions?: StaticMiddlewareOptions;
}

export interface KoaConfig {
  host?: string;
  port?: number;
  bodyParserOptions?: ParserOptions;
  keys?: string[];
  sessionOptions?: Partial<session.opts>;
  /** whether print origin of server or not */
  printOrigin?: boolean;
}
export interface CustomizeKoaConfig extends KoaConfig {
  /** http middleware config */
  useErrorCatchMW?: boolean;
  useDebugMW?: boolean;
  corsWMOptions?: CorsMWOptions;
  logsMWOptions?: LogsMWOptions;
  useForumMW?: boolean;
  staticWMConfig?: StaticMWConfig;
}

export interface Ctx4Upgrade {
  req: IncomingMessage;
  socket: Socket;
  head: Buffer;
  ws?: WebSocket;
}
export type WsMiddleware = (ctx: Ctx4Upgrade, next) => Promise<void>;
