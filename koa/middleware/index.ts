import cors from './cors';
import {
  debugRouter,
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
import {sessionRouter} from './session';
export {debugRouter, sessionRouter};

export const requestMiddleware = {
  cors,
  debug: debugRouter.routes(),
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
