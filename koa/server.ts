import cors from './cors';
import log from './log';
import debug from './debug';
import http from 'http';
import Koa from 'koa';
import {getAFreePort} from '../node';

interface Options {
  port?: number;
  keys?: string[];
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
  let {port, keys} = options;
  const app = new Koa();
  if (Array.isArray(keys)) {
    app.keys = keys;
  }
  middlewareList.forEach(middleware => {
    app.use(middleware);
  });
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
  return await startKoaServer([cors(), ...middlewareList, debug], options);
}
