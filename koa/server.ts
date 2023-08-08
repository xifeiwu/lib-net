import cors from './cors';
import log from './log';
import debug from './debug';
import http from 'http';
import Koa from 'koa';
import {getAFreePort} from '../node';

export async function startKoaServer(middlewareList: Koa.Middleware[] = []): Promise<{
  href: string;
  port: number;
  server: http.Server;
}> {
  const app = new Koa();
  middlewareList.forEach(middleware => {
    app.use(middleware);
  });
  const port = await getAFreePort(3000);
  const server = app.listen(port);
  return new Promise((res, rej) => {
    server.on('listening', () => {
      const href = `http://127.0.0.1:${port}`;
      console.log(`server start on ${href}`);
      res({
        href,
        port,
        server,
      });
    });
    server.on('error', error => {
      rej(error);
    });
  });
}

export async function startDefaultServer(middlewareList: Koa.Middleware[] = []) {
  return await startKoaServer([cors(), ...middlewareList, debug]);
}