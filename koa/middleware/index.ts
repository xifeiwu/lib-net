import {corsKoaMw} from './cors';
import {getDebugKoaMw, debugKoaRouter, debugHttpUpgradeMw} from './debug';
import {logKoaMw} from './log';
import {getDefaultStaticOptionsForDirs, getDefaultStaticOptionsForSpaDirs, staticKoaMw} from './static';
import {logsKoaMw} from './logs';
import {socksKoaMw, socksHttpUpgradeMw} from './socks/index';
import {mockKoaMw} from './mock';
import {sessionRouter} from './session';
import {getForumKoaMw, forumKoaRouter, forumHttpUpgradeMw} from './forum';

export {debugKoaRouter, sessionRouter, forumKoaRouter};
export * from './others';

/**
 * @deprecated by koaRequestMiddleware
 */
export const requestMiddleware = {
  cors: corsKoaMw,
  debug: getDebugKoaMw(),
  log: logKoaMw,
  static: staticKoaMw,
  logs: logsKoaMw,
  socks: socksKoaMw,
  mock: mockKoaMw,
  forum: getForumKoaMw(),
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
