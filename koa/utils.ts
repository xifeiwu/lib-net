import http from 'http';
import {Socket} from 'net';
import Koa from 'koa';

/**
 * @param options
 * @returns
 */
export function generateKoaCtx(options?: {
  requestHeaders?: object;
  requestBody?: object;
  keyForRequestBody?: string;
  state?: Koa.DefaultState;
}): Koa.Context {
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
