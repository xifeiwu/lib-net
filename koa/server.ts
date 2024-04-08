import http from 'http';
import Koa from 'koa';
import session from 'koa-session';
import cors from './middleware/cors';
import log from './middleware/log';
import debug from './middleware/debug';
import assist from './middleware/assist';
import errorCatchMiddleware from './middleware/error-catch';
import {getAFreePort, isNumber, toInt} from '../external';

const middlewareMap = {
  debug,
  assist,
};

type MiddlewareName = keyof typeof middlewareMap;

export interface CustomKoaServerOptions {
  host?: string;
  port?: number;
  keys?: string[];
  sessionOptions?: Partial<session.opts>;
  printUrl?: boolean;
}

/**
 * Start a http server based on Koa
 * @param middlewareList
 * @param options
 * @returns
 */
export async function startKoaServer(
  middlewareList: Array<Koa.Middleware | MiddlewareName> = [],
  options: CustomKoaServerOptions = {}
): Promise<{
  origin: string;
  port: number;
  server: http.Server;
  app: Koa;
}> {
  const {host = '0.0.0.0', keys, sessionOptions, printUrl} = options;
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
    if (Object.prototype.hasOwnProperty.call(middlewareMap, middleware)) {
      app.use(middlewareMap[middleware as MiddlewareName]);
    } else {
      app.use(middleware as Koa.Middleware);
    }
  }
  port = toInt(port);
  if (!isNumber(port)) {
    port = await getAFreePort(3000);
  }
  const server = app.listen(port, host);
  return new Promise((res, rej) => {
    server.on('listening', () => {
      const origin = `http://${host}:${port}`;
      printUrl && console.log(`http server started on ${origin}`);
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
  return await startKoaServer([...middlewareList, 'debug'], options);
}

/** start a koa server with all middlewares that this module have */
export async function startFullFeatureServer() {}
