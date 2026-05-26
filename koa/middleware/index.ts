import {getCorsKoaMw} from './cors';
import {debugKoaRouter, debugHttpUpgradeMw} from './debug';
import {getLogKoaMw} from './log';
import {resolveStaticMiddlewareOptionsList, getStaticKoaMw} from './static';
import {getLogsKoaRouter} from './logs';
import {socksKoaRouter, getSocksHttpUpgradeMw, getSocksTcpMw} from './socks/index';
import {getMockKoaMw} from './mock';
import {sessionRouter} from './session';
import {forumKoaRouter, forumHttpUpgradeMw} from './forum';
import {cookieRouter} from './cookie';

import {getProxyKoaMw, getProxyHttpUpgradeMw} from './proxy';
import {getCustomizeResponseKoaMw} from './others';
import {getAssetsTcpMw} from './assets';

export {
  getCorsKoaMw,
  debugKoaRouter,
  debugHttpUpgradeMw,
  getLogKoaMw,
  resolveStaticMiddlewareOptionsList,
  getStaticKoaMw,
  getLogsKoaRouter,
  socksKoaRouter,
  getSocksHttpUpgradeMw,
  getMockKoaMw,
  sessionRouter,
  forumKoaRouter,
  forumHttpUpgradeMw,
  cookieRouter,
  getProxyKoaMw,
  getProxyHttpUpgradeMw,
  getCustomizeResponseKoaMw,
  getAssetsTcpMw,
  getSocksTcpMw,
};

/**
 * @deprecated, use mw or getMw function directly
 */
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

/**
 * @deprecated, use mw or getMw function directly
 */
export const httpUpgradeMwMap = {
  debug: debugHttpUpgradeMw,
  socks: getSocksHttpUpgradeMw,
  forum: forumHttpUpgradeMw,
};

/**
 * @deprecated by httpUpgradeMwMap
 */
export const koaUpgradeMiddleware = httpUpgradeMwMap;
