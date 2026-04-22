import {corsKoaMw} from './cors';
import {debugKoaRouter, debugHttpUpgradeMw} from './debug';
import {logKoaMw} from './log';
import {getDefaultStaticOptionsForDirs, getDefaultStaticOptionsForSpaDirs, staticKoaMw} from './static';
import {logsKoaMw} from './logs';
import {socksKoaRouter, socksHttpUpgradeMw} from './socks/index';
import {mockKoaMw} from './mock';
import {sessionRouter} from './session';
import {forumKoaRouter, forumHttpUpgradeMw} from './forum';
import {cookieRouter} from './cookie';

export {debugKoaRouter, sessionRouter, forumKoaRouter, socksKoaRouter, cookieRouter};
export * from './others';

/**
 * @deprecated by koaRequestMiddleware
 */
export const requestMiddleware = {
  cors: corsKoaMw,
  debug: debugKoaRouter.routes(),
  log: logKoaMw,
  static: staticKoaMw,
  logs: (options?) => logsKoaMw(options).routes(),
  socks: socksKoaRouter.routes(),
  mock: mockKoaMw,
  forum: forumKoaRouter.routes(),
};
export const koaRequestMiddleware = requestMiddleware;

/**
 * @deprecated by koaUpgradeMiddleware
 */
export const upgradeMiddleware = {
  debug: debugHttpUpgradeMw,
  socks: socksHttpUpgradeMw,
  forum: forumHttpUpgradeMw,
};

export const koaUpgradeMiddleware = upgradeMiddleware;

export {getDefaultStaticOptionsForDirs, getDefaultStaticOptionsForSpaDirs};
