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
export {getProxyKoaMw} from './proxy';
export {getCustomizeResponseKoaMw} from './others';

export const koaMwMap = {
  cors: getCorsKoaMw,
  debug: debugKoaRouter.routes(),
  log: getLogKoaMw,
  static: getStaticKoaMw,
  logs: (options?) => getLogsKoaRouter(options).routes(),
  socks: socksKoaRouter.routes(),
  mock: getMockKoaMw,
  forum: forumKoaRouter.routes(),
};
/**
 * @deprecated by koaMwMap
 */
export const koaRequestMiddleware = koaMwMap;

export const httpUpgradeMwMap = {
  debug: debugHttpUpgradeMw,
  socks: getSocksHttpUpgradeMw,
  forum: forumHttpUpgradeMw,
};

/**
 * @deprecated by httpUpgradeMwMap
 */
export const koaUpgradeMiddleware = httpUpgradeMwMap;
export {getDefaultStaticOptionsForDirs, getDefaultStaticOptionsForSpaDirs};
