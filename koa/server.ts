import cors from './cors';
import log from './log';
import debug from './debug';
import http from 'http';
import Koa from 'koa';
import session from 'koa-session';
import {getAFreePort} from '../node';

interface Options {
  port?: number;
  keys?: string[];
  sessionOptions?: Partial<session.opts>;
}
export async function startKoaServer(
  middlewareList: Koa.Middleware[] = [],
  options: Options = {}
): Promise<{
  href: string;
  port: number;
  server: http.Server;
  app: Koa;
}> {
  let {port, keys, sessionOptions} = options;
  const app = new Koa();
  if (Array.isArray(keys)) {
    app.keys = keys;
  }
  if (sessionOptions) {
    app.use(session(sessionOptions, app));
  }
  for (let middleware of middlewareList) {
    app.use(middleware);
  }
  if (!port) {
    port = await getAFreePort(3000);
  }
  const server = app.listen(port);
  return new Promise((res, rej) => {
    server.on('listening', () => {
      const href = `http://127.0.0.1:${port}`;
      console.log(`server start on ${href}`);
      res({
        href,
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

export async function startDefaultServer(middlewareList: Koa.Middleware[] = [], options: Options = {}) {
  // @ts-ignore
  return await startKoaServer([cors(), ...middlewareList, debug], options);
}
