import path from 'path';
import Koa from 'koa';
import KoaSession from 'koa-session';
import {KoaConfig, KoaMiddlewareConfig} from '../types';
import {PORT, uploadDirOnCwd} from '../../external';
import {SOCKS_SERVER_CONFIG} from '../middleware/socks/service';

export const mwConfigDefault: KoaMiddlewareConfig = {
  useDebugMW: true,
  corsWMOptions: {},
  logsMWOptions: {},
  useForumMW: true,
};

export const KOA_CONFIG: KoaConfig = {
  port: PORT.fullFeatureHttpServer.port,
  bodyParserOptions: {
    uploadDir: uploadDirOnCwd,
  },
  mwConfig: {
    ...mwConfigDefault,
    logMWOptions: {
      logBody: {
        maxSize: 1024,
      },
      catchAndWrapError: true,
    },
    staticWMConfig: {
      spaDirList: [
        {
          fullpath: path.resolve(process.env.HOME, 'code/react/start/browser-feature/react-tsx-less/dist'),
          entries: ['net', 'browser-feature'],
        },
      ],
    },
    socksConfig: SOCKS_SERVER_CONFIG,
  },
  printOrigin: true,
};

// export const defaultConfig: Partial<KoaSession.opts> = {
export const defaultConfig: Partial<KoaSession.opts> = {
  key: 'koa.sess' /** (string) cookie key (default is koa.sess) */,
  /** (number || 'session') maxAge in ms (default is 1 days) */
  /** 'session' will result in a cookie that expires when session/browser is closed */
  /** Warning: If a session cookie is stolen, this cookie will never expire */
  maxAge: 86400000,
  autoCommit: true /** (boolean) automatically commit headers (default true) */,
  overwrite: true /** (boolean) can overwrite or not (default true) */,
  httpOnly: true /** (boolean) httpOnly or not (default true) */,
  signed: true /** (boolean) signed or not (default true) */,
  rolling:
    false /** (boolean) Force a session identifier cookie to be set on every response. The expiration is reset to the original maxAge, resetting the expiration countdown. (default is false) */,
  renew:
    false /** (boolean) renew session when session is nearly expired, so we can always keep user logged in. (default is false)*/,
  // secure: true /** (boolean) secure cookie*/,
  sameSite: null /** (string) session cookie sameSite options (default null, don't set it) */,
};
