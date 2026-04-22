import http from 'http';
import {Socket} from 'net';
import Koa from 'koa';
import KoaRouter from 'koa-router';
import {KoaConfig} from '../types';
import Schema, {Values} from 'async-validator';
import {parseHttpBody} from '../../service/external';
/**
 * @param options
 * @returns Koa.Context, return any to avoid type difference on differnt Koa version
 */
export function generateKoaCtx<KoaState = Koa.DefaultState>(options?: {
  /** for controller layer */
  path?: string;
  query?: object;
  method?: string;
  requestHeaders?: object;
  requestBody?: object;
  keyForRequestBody?: string;
  state?: KoaState;
}) {
  const {
    method = 'get',
    path = '/',
    query,
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
  Object.entries({method, path, query}).forEach(([key, value]) => {
    ctx[key] = value;
  });
  return ctx;
}

export interface RouteInfo {
  methods: string[];
  path: string;
}

function getRouterPathnameList(router: KoaRouter, prefix = '') {
  return router.stack.flatMap(layer => {
    if (!layer.path) return [];
    return [
      {
        name: layer.name,
        methods: layer.methods,
        path: prefix + layer.path,
      },
    ];
  });
}

export function getAllRouterPathnameList(routers: KoaRouter[]): RouteInfo[] {
  return routers.flatMap(router => getRouterPathnameList(router));
}

export function serializeKoaConfig(koaConfig: KoaConfig) {
  const {requestMiddlewares = [], upgradeMiddlewares = [], ...rest} = koaConfig;
  return {
    ...rest,
    requestMiddlewares: requestMiddlewares.map(it => it.name),
    upgradeMiddlewares: upgradeMiddlewares.map(it => it.name),
  };
}

export async function wrapValidate(rules: Schema, data: Values) {
  try {
    const success = await rules.validate(data);
    return {success};
  } catch (err) {
    // return err;
    return {
      success: false,
      message: JSON.stringify(err.fields),
    };
  }
}

export function setRequestBodyOfCtx(ctx: Koa.Context, requestBody: any) {
  ctx.state.requestBody = requestBody;
}
/**
 * Get requestBody of ctx.state if exist, or parse request body and save parsed data in ctx.state.requestBody.
 * @param ctx
 * @returns
 */
export async function getRequestBodyOfCtx(ctx: Koa.Context) {
  let {requestBody} = ctx.state;
  if (requestBody === undefined) {
    requestBody = (await parseHttpBody(ctx.req)) ?? null;
    ctx.state.requestBody = requestBody;
  }
  return requestBody;
}
