import http from 'http';
import path from 'path';
import {Socket} from 'net';
import Koa from 'koa';
import {KoaConfig, KoaMiddlewareConfig} from './types';
import {PORT, uploadDirOnCwd} from '../external';

/**
 * @param options
 * @returns Koa.Context, return any to avoid type difference on differnt Koa version
 */
export function generateKoaCtx(options?: {
  requestHeaders?: object;
  requestBody?: object;
  keyForRequestBody?: string;
  state?: Koa.DefaultState;
}): any {
  const {
    requestHeaders = {},
    state = {},
    requestBody = null,
    keyForRequestBody = undefined,
  } = options ? options : {};
  const socket = new Socket();
  const request = new http.IncomingMessage(socket);
  Object.entries(requestHeaders).forEach(([key, value]) => {
    request.headers[key] = value;
  });
  const response = new http.ServerResponse(request);
  const app = new Koa();
  const ctx = app.createContext(request, response) as Koa.Context;
  if (requestBody) {
    ctx.request[keyForRequestBody ?? 'body'] = requestBody;
  }
  Object.entries(state).forEach(([key, value]) => {
    ctx.state[key] = value;
  });
  return ctx;
}

export function serializeKoaConfig(koaConfig: KoaConfig) {
  const {requestMiddlewares = [], upgradeMiddlewares = [], ...rest} = koaConfig;
  return {
    ...rest,
    requestMiddlewares: requestMiddlewares.map(it => it.name),
    upgradeMiddlewares: upgradeMiddlewares.map(it => it.name),
  };
}
export const mwConfigDefault: KoaMiddlewareConfig = {
  useDebugMW: true,
  corsWMOptions: {},
  logsMWOptions: {},
  useForumMW: true,
};

export const localKoaConfig: KoaConfig = {
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
    },
    staticWMConfig: {
      spaDirList: [
        {
          fullpath: path.resolve(process.env.HOME, 'code/react/start/browser-feature/react-tsx-less/dist'),
          entries: ['net', 'browser-feature'],
        },
      ],
    },
  },
  printOrigin: true,
};
