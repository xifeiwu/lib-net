import http from 'http';
import Koa from 'koa';
import session from 'koa-session';
import cors from './middleware/cors';
import {middlewareDebug, wsMiddlewareDebug} from './debug';
import logs from './middleware/logs';
import {forumMiddleware, forumWsMiddleware} from './forum';
import errorCatchMiddleware from './middleware/error-catch';
import {getAFreePort, isNumber, toInt, PORT} from '../external';
import {WsMiddleware, getUpgradeHandler} from './websocket';

export interface CustomKoaServerOptions {
  host?: string;
  port?: number;
  keys?: string[];
  sessionOptions?: Partial<session.opts>;
  wsMiddlewareList?: WsMiddleware[];
  /** whether print origin of server or not */
  printOrigin?: boolean;
}

/**
 * Start a http server based on Koa
 * @param middlewareList
 * @param options
 * @returns
 */
export async function startKoaServer(
  middlewareList: Array<Koa.Middleware> = [],
  options: CustomKoaServerOptions = {}
): Promise<{
  origin: string;
  port: number;
  server: http.Server;
  app: Koa;
}> {
  const {host = '0.0.0.0', keys, sessionOptions, printOrigin, wsMiddlewareList = []} = options;
  let {port} = options;
  const app = new Koa();
  if (Array.isArray(keys)) {
    app.keys = keys;
  }
  /** errorCatchMiddleware should be set as first koa middleware */
  app.use(errorCatchMiddleware);
  if (sessionOptions) {
    app.use(session(sessionOptions, app));
  }
  for (const middleware of middlewareList) {
    app.use(middleware as Koa.Middleware);
  }
  port = toInt(port);
  if (!isNumber(port)) {
    port = await getAFreePort(PORT.exploreStart.port);
  }
  const server = app.listen(port, host);
  if (wsMiddlewareList.length > 0) {
    server.on('upgrade', getUpgradeHandler(wsMiddlewareList));
  }
  return new Promise((res, rej) => {
    server.on('listening', () => {
      const origin = `http://${host}:${port}`;
      printOrigin && console.log(`http server started on ${origin}`);
      res({
        origin,
        port,
        server,
        app,
      });
    });
    server.on('error', error => {
      rej(error);
    });
  });
}

/**
 * A http server mainly used for debug, with two koa middleware: cors, debug.
 */
export async function startDebugServer(
  middlewareList: Koa.Middleware[] = [],
  options: CustomKoaServerOptions = {}
) {
  const {wsMiddlewareList = [], ...restOptions} = options;
  return await startKoaServer([...middlewareList, middlewareDebug], {
    ...restOptions,
    wsMiddlewareList: [...wsMiddlewareList, wsMiddlewareDebug],
  });
}

/** start a koa server with all middlewares that this module have */
export async function startFullFeatureServer(
  middlewareList: Koa.Middleware[] = [],
  options: CustomKoaServerOptions = {}
) {
  const {wsMiddlewareList = [], ...restOptions} = options;
  const {origin, server, app} = await startKoaServer(
    [...middlewareList, cors(), middlewareDebug, logs(), forumMiddleware],
    {
      ...restOptions,
      wsMiddlewareList: [...wsMiddlewareList, wsMiddlewareDebug, forumWsMiddleware],
    }
  );
  return {origin, server, app};
}
