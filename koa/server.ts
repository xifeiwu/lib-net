import Koa from 'koa';
import session from 'koa-session';
import {
  requestMiddleware,
  upgradeMiddleware,
  getDefaultStaticOptionsForDirs,
  getDefaultStaticOptionsForSpaDirs,
} from './middleware';

// import {forumMiddleware, forumWsMiddleware} from './forum';
import {getUpgradeHandler} from './upgrade';
import {
  getAFreePort,
  isNumber,
  toNumber,
  PORT,
  closePortIfInUse,
  getLocalIpAddress,
  customDeepMerge,
  isString,
  logColorful,
  isObject,
} from '../service/external';
import {KoaConfig, KoaServerInfo, KoaShortCutConfig} from './types';
import {DEFAULT_KOA_CONFIG} from './service';

export function getKoa(koaConfig: KoaConfig = {}, shortCutConfig?: KoaShortCutConfig) {
  const configKeys = Object.keys(koaConfig) as Array<keyof KoaConfig>;
  const requestMiddlewaresIndex = configKeys.indexOf('requestMiddlewares');
  const upgradeMiddlewaresIndex = configKeys.indexOf('upgradeMiddlewares');
  /** if mwConfig in front, use middleware from wmConfig first, else use requestMiddlewares first */
  const mwConfigIndex = configKeys.indexOf('mwConfig');
  const requestMiddlewareAction: 'push' | 'unshift' =
    requestMiddlewaresIndex <= mwConfigIndex ? 'push' : 'unshift';
  const upgradeMiddlewareAction: 'push' | 'unshift' =
    upgradeMiddlewaresIndex <= mwConfigIndex ? 'push' : 'unshift';
  const {
    bodyParserOptions = {},
    keys,
    sessionOptions,
    requestMiddlewares = [],
    upgradeMiddlewares = [],
    mwConfig = {},
  } = koaConfig;
  const {staticDir, uploadDir} = shortCutConfig ?? {};
  const {logMWOptions, useDebugMW, corsWMOptions, logsMWOptions, socksConfig, useForumMW} = mwConfig;
  let {staticWMConfig} = mwConfig;
  useDebugMW &&
    requestMiddlewares[requestMiddlewareAction](requestMiddleware.debug) &&
    upgradeMiddlewares[upgradeMiddlewareAction](upgradeMiddleware.debug);
  corsWMOptions && requestMiddlewares[requestMiddlewareAction](requestMiddleware.cors(corsWMOptions));
  logsMWOptions && requestMiddlewares[requestMiddlewareAction](requestMiddleware.logs(logsMWOptions));
  socksConfig &&
    requestMiddlewares[requestMiddlewareAction](requestMiddleware.socks) &&
    upgradeMiddlewares[upgradeMiddlewareAction](upgradeMiddleware.socks(socksConfig));
  useForumMW &&
    requestMiddlewares[requestMiddlewareAction](requestMiddleware.forum) &&
    upgradeMiddlewares[upgradeMiddlewareAction](upgradeMiddleware.forum);
  if (staticDir) {
    const staticDirList = Array.isArray(staticDir) ? staticDir : [staticDir];
    if (!staticWMConfig) {
      staticWMConfig = {
        dirList: staticDirList,
      };
    } else {
      if (!Array.isArray(staticWMConfig.dirList)) {
        staticWMConfig.dirList = [];
      }
      staticWMConfig.dirList.push(...staticDirList);
    }
  }
  // if (staticDir) {
  //   staticDir = path.resolve(process.cwd(), staticDir);
  //   const dirList = get(envConfig, ['mwConfig', 'staticWMConfig', 'dirList'], []);
  //   !dirList.includes(staticDir) && dirList.push(staticDir);
  //   set(envConfig, ['mwConfig', 'staticWMConfig', 'dirList'], dirList);
  // }
  if (staticWMConfig) {
    const {dirList = [], spaDirList = [], mwOptions} = staticWMConfig;
    /**
     * It is better to place spaStaticDir before staticDir:
     * spa files should be less than static files
     * url to spa should not intercepted by static file
     */
    const staticSpaDirOptionsList = getDefaultStaticOptionsForSpaDirs(spaDirList, mwOptions);
    const staticDirOptionsList = getDefaultStaticOptionsForDirs(dirList, mwOptions);
    const staticMiddlewares = [...staticSpaDirOptionsList, ...staticDirOptionsList].map(config =>
      requestMiddleware.static(config)
    );
    requestMiddlewares.push(...staticMiddlewares);
  }
  const app = new Koa();
  /**
   * Will override bodyParserOptions.uploadDir if it exist
   * add bodyParserOptions to context
   * so we can get bodyParserOptions by ctx.bodyParserOptions for parseBody function
   */
  if (uploadDir) {
    bodyParserOptions.uploadDir = uploadDir;
  }
  app.context.bodyParserOptions = bodyParserOptions;
  if (Array.isArray(keys)) {
    app.keys = keys;
  }
  if (sessionOptions) {
    /** session middle should be used as first middleware */
    requestMiddlewares.unshift(session(sessionOptions, app));
  }
  /** errorCatchMiddleware should be set as first koa middleware */
  if (logMWOptions) {
    requestMiddlewares.unshift(requestMiddleware.log(logMWOptions));
  }

  /** app.middleware assginment should happen before app.listen */
  app.middleware = requestMiddlewares;
  return {app, upgradeMiddlewares, koaConfig};
}
/**
 * start koa server with KoaConfig
 */
export async function startKoaServer(
  koaConfig: KoaConfig = {},
  shortCutConfig?: KoaShortCutConfig
): Promise<KoaServerInfo> {
  /**
   * When host is set to '0.0.0.0', the service can be accessed from outside
   */
  const {host = '0.0.0.0', port, printOrigin = true} = koaConfig;
  let finalPort = toNumber(port);
  if (!isNumber(finalPort)) {
    finalPort = await getAFreePort(PORT.exploreStart.port);
  }
  await closePortIfInUse(finalPort);

  /** app.middleware assginment should happen before app.listen */
  const {app, upgradeMiddlewares, koaConfig: finalKoaConfig} = getKoa(koaConfig, shortCutConfig);
  const server = app.listen(finalPort, host);
  if (upgradeMiddlewares.length > 0) {
    server.on('upgrade', getUpgradeHandler(upgradeMiddlewares));
  }
  return new Promise((res, rej) => {
    server.on('listening', () => {
      const origin = `http://${host}:${finalPort}`;
      if (printOrigin) {
        const originInfo = {
          local: origin,
          ip: `http://${getLocalIpAddress()}:${finalPort}`,
        };
        if (isObject(printOrigin)) {
          logColorful({}, {...(printOrigin as object), ...originInfo});
        } else {
          logColorful(
            {},
            {
              name: isString(printOrigin) ? printOrigin : 'http server',
              ...originInfo,
            }
          );
        }
      }
      res({
        origin,
        host,
        port: finalPort,
        server,
        app,
        koaConfig: finalKoaConfig,
      });
    });
    server.on('error', error => {
      rej(error);
    });
  });
}

const customizeDeepMerge = customDeepMerge();
/**
 * A http server mainly used for debug, with two koa middleware: cors, debug.
 */
export async function startKoaDebugServer(koaConfig?: KoaConfig) {
  const mergedConfig = customizeDeepMerge<KoaConfig, KoaConfig>(
    {mwConfig: {useDebugMW: true}},
    koaConfig ?? {}
  );
  return await startKoaServer(mergedConfig);
}

export async function startKoaFullFeatureServer(koaConfig?: KoaConfig) {
  const mergedConfig = customizeDeepMerge<KoaConfig, KoaConfig>(DEFAULT_KOA_CONFIG, koaConfig ?? {});
  return await startKoaServer(mergedConfig);
}
