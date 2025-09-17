import cors from './cors';
import {requestRouter as debugRequestRouter, upgradeMiddelware as upgradeMiddelwareOfDebug} from './debug';
import {getLogMiddleware} from './log';
import {
  getDefaultStaticOptionsForDirs,
  getDefaultStaticOptionsForSpaDirs,
  getStaticMiddleware,
} from './static';
import logs from './logs';
import {
  requestMiddleware as requestMw4Socks,
  getUpgradeMiddleware as getUpgradeMw4Socks,
} from './socks/index';
import {getMockMiddleware} from './mock';
import {sessionRouter} from './session';
import {requestRouter as forumRequestRouter, upgradeMiddleware as forumUpgradeMiddleware} from './forum';

export {debugRequestRouter, sessionRouter, forumRequestRouter};
export * from './others';

/**
 * @deprecated by koaRequestMiddleware
 */
export const requestMiddleware = {
  cors,
  debug: debugRequestRouter.routes(),
  log: getLogMiddleware,
  static: getStaticMiddleware,
  logs,
  socks: requestMw4Socks,
  mock: getMockMiddleware,
  forum: forumRequestRouter.routes(),
};
export const koaRequestMiddleware = requestMiddleware;

/**
 * @deprecated by koaUpgradeMiddleware
 */
export const upgradeMiddleware = {
  debug: upgradeMiddelwareOfDebug,
  socks: getUpgradeMw4Socks,
  forum: forumUpgradeMiddleware,
};

export const koaUpgradeMiddleware = upgradeMiddleware;

export {getDefaultStaticOptionsForDirs, getDefaultStaticOptionsForSpaDirs};
