import http from 'http';
import {Socket} from 'net';
import Koa from 'koa';
import {KoaConfig} from '../types';
/**
 * @param options
 * @returns Koa.Context, return any to avoid type difference on differnt Koa version
 */
export function generateKoaCtx<KoaState = Koa.DefaultState>(options?: {
  requestHeaders?: object;
  requestBody?: object;
  keyForRequestBody?: string;
  state?: KoaState;
}) {
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
  const ctx = app.createContext<KoaState>(request, response);
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
