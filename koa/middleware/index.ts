import cors from './cors';
import {
  requestMiddleware as requestMiddlewareOfDebug,
  upgradeMiddelware as upgradeMiddelwareOfDebug,
} from './debug';
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

export const requestMiddleware = {
  cors,
  debug: requestMiddlewareOfDebug,
  log: getLogMiddleware,
  static: getStaticMiddleware,
  logs,
  socks: requestMw4Socks,
  mock: getMockMiddleware,
};
export const upgradeMiddleware = {
  debug: upgradeMiddelwareOfDebug,
  socks: getUpgradeMw4Socks,
};

export {getDefaultStaticOptionsForDirs, getDefaultStaticOptionsForSpaDirs};
