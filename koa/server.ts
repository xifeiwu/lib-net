import cors from './cors';
import log from './log';
import debug from './debug';
import http from 'http';
import Koa from 'koa';
import session from 'koa-session';
import {getAFreePort, isNumber} from '../node';
import errorCatchMiddleware from './error-catch';

export interface CustomKoaServerOptions {
  host?: string;
  port?: number;
  keys?: string[];
  sessionOptions?: Partial<session.opts>;
}
export async function startKoaServer(
  middlewareList: Koa.Middleware[] = [],
  options: CustomKoaServerOptions = {}
): Promise<{
  url: string;
  port: number;
  server: http.Server;
  app: Koa;
}> {
  let {host = '0.0.0.0', port, keys, sessionOptions} = options;
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
    app.use(middleware);
  }
  if (!port || !isNumber(port)) {
    port = await getAFreePort(3000);
  }
  const server = app.listen(port, host);
  return new Promise((res, rej) => {
    server.on('listening', () => {
      const url = `http://127.0.0.1:${port}`;
      console.log(`server start on ${url}`);
      res({
        url,
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

/** A wrapper for startKoaServer, add two default koa middleware: cors, debug  */
export async function startDefaultServer(middlewareList: Koa.Middleware[] = [], options: CustomKoaServerOptions = {}) {
  // @ts-ignore
  return await startKoaServer([cors(), ...middlewareList, debug], options);
}
