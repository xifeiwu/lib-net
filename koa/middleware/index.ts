import {getCorsKoaMw} from './cors';
import {debugKoaRouter, debugHttpUpgradeMw} from './debug';
import {getLogKoaMw} from './log';
import {getDefaultStaticOptionsForDirs, getDefaultStaticOptionsForSpaDirs, getStaticKoaMw} from './static';
import {getLogsKoaRouter} from './logs';
import {socksKoaRouter, getSocksHttpUpgradeMw} from './socks/index';
import {getMockKoaMw} from './mock';
import {sessionRouter} from './session';
import {forumKoaRouter, forumHttpUpgradeMw} from './forum';
import {cookieRouter} from './cookie';

export {debugKoaRouter, sessionRouter, forumKoaRouter, socksKoaRouter, cookieRouter};
export * from './others';

/**
 * @deprecated by koaRequestMiddleware
 */
export const requestMiddleware = {
  cors: getCorsKoaMw,
  debug: debugKoaRouter.routes(),
  log: getLogKoaMw,
  static: getStaticKoaMw,
  logs: (options?) => getLogsKoaRouter(options).routes(),
  socks: socksKoaRouter.routes(),
  mock: getMockKoaMw,
  forum: forumKoaRouter.routes(),
};
export const koaRequestMiddleware = requestMiddleware;

/**
 * @deprecated by koaUpgradeMiddleware
 */
export const upgradeMiddleware = {
  debug: debugHttpUpgradeMw,
  socks: getSocksHttpUpgradeMw,
  forum: forumHttpUpgradeMw,
};

export const koaUpgradeMiddleware = upgradeMiddleware;

export {getDefaultStaticOptionsForDirs, getDefaultStaticOptionsForSpaDirs};
