import http from 'http';
import Koa from 'koa';
import session from 'koa-session';
import cors from './middleware/cors';
import {debugMiddleware, debugMiddlewareWs} from './debug';
import log from './middleware/log';
import logs from './middleware/logs';
import {forumMiddleware, forumWsMiddleware} from './forum';
import errorCatchMiddleware from './middleware/error-catch';
import {getUpgradeHandler} from './websocket';
import {getAFreePort, isNumber, toInt, PORT, closePortIfInUse} from '../external';
import {CustomizeKoaConfig, KoaConfig, WsMiddleware} from './types';
import {
  getDefaultStaticOptionsForDirs,
  getDefaultStaticOptionsForSpaDirs,
  getStaticMiddleware,
} from './static';

/**
 * Start a http server based on Koa, include middlwares:
 * 1. errorCatchMiddleware
 * 2. sessionMiddleware(if sessionOptions provided)
 * @param middlewareList
 * @param options
 * @returns
 */
export async function startKoaServer(
  options: KoaConfig = {},
  middlewareList?: Array<Koa.Middleware>,
  wsMiddlewareList?: WsMiddleware[]
): Promise<{
  origin: string;
  host: string;
  port: number;
  server: http.Server;
  app: Koa;
}> {
  middlewareList = middlewareList ?? [];
  wsMiddlewareList = wsMiddlewareList ?? [];
  const {host = '0.0.0.0', port, bodyParserOptions, keys, sessionOptions, printOrigin} = options;
  let finalPort = toInt(port);
  if (!isNumber(finalPort)) {
    finalPort = await getAFreePort(PORT.exploreStart.port);
  }
  await closePortIfInUse(finalPort);

  const app = new Koa();
  /** add  */
  app.context.bodyParserOptions = bodyParserOptions;
  if (Array.isArray(keys)) {
    app.keys = keys;
  }
  if (sessionOptions) {
    /** session middle should be used as first middleware */
    middlewareList.unshift(session(sessionOptions, app));
  }

  /** app.middleware assginment should happen before app.listen */
  app.middleware = middlewareList;
  const server = app.listen(finalPort, host);
  if (wsMiddlewareList.length > 0) {
    server.on('upgrade', getUpgradeHandler(wsMiddlewareList));
  }
  return new Promise((res, rej) => {
    server.on('listening', () => {
      const origin = `http://${host}:${finalPort}`;
      printOrigin && console.log(`http server started on ${origin}`);
      res({
        origin,
        host,
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

export async function startCustomizedKoaServer(
  options: CustomizeKoaConfig,
  middlewareList?: Array<Koa.Middleware>,
  wsMiddlewareList?: WsMiddleware[]
) {
  middlewareList = middlewareList ?? [];
  wsMiddlewareList = wsMiddlewareList ?? [];
  const {useErrorCatchMW, useDebugMW, corsWMOptions, logsMWOptions, useForumMW, staticWMConfig} = options;

  /** errorCatchMiddleware should be set as first koa middleware */
  if (useErrorCatchMW) {
    middlewareList.unshift(errorCatchMiddleware);
  }
  useDebugMW && middlewareList.push(debugMiddleware) && wsMiddlewareList.push(debugMiddlewareWs);
  corsWMOptions && middlewareList.push(cors(corsWMOptions));
  logsMWOptions && middlewareList.push(logs(logsMWOptions));
  useForumMW && middlewareList.push(forumMiddleware) && wsMiddlewareList.push(forumWsMiddleware);
  if (staticWMConfig) {
    const {dirList = [], spaDirList = [], mwOptions} = staticWMConfig;
    const staticSpaDirOptionsList = getDefaultStaticOptionsForSpaDirs(spaDirList, mwOptions);
    const staticDirOptionsList = getDefaultStaticOptionsForDirs(dirList, mwOptions);
    const staticMiddlewares = [...staticSpaDirOptionsList, ...staticDirOptionsList].map(config =>
      getStaticMiddleware(config)
    );
    middlewareList.push(...staticMiddlewares);
  }
  return await startKoaServer(options, middlewareList, wsMiddlewareList);
}
/**
 * A http server mainly used for debug, with two koa middleware: cors, debug.
 */
export async function startDebugServer(
  middlewareList: Koa.Middleware[] = [],
  options: CustomizeKoaConfig = {}
) {
  return await startCustomizedKoaServer({useDebugMW: true}, middlewareList);
}

/** start a koa server with all middlewares that this module have */
// export async function startFullFeatureServer(
//   middlewareList: Koa.Middleware[] = [],
//   options: CustomizeKoaConfig = {}
// ) {
//   const {wsMiddlewareList = [], ...restOptions} = options;
//   const {origin, server, app} = await startKoaServer(
//     [
//       // log({
//       //   showHeaders: false,
//       //   showPayload: false,
//       // }),
//       ...middlewareList,
//       cors(),
//       debugMiddleware,
//       logs(),
//       forumMiddleware,
//     ],
//     {
//       ...restOptions,
//       wsMiddlewareList: [...wsMiddlewareList, debugMiddlewareWs, forumWsMiddleware],
//     }
//   );
//   return {origin, server, app};
// }
