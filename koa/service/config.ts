import path from 'path';
import {KoaConfig, KoaMiddlewareConfig} from '../types';
import {PORT, uploadDirOnCwd} from '../../service/external';
import {SOCKS_SERVER_CONFIG} from '../middleware/socks/service';

export const defaultMwConfig: KoaMiddlewareConfig = {
  useDebugMW: true,
  corsWMOptions: {},
  logsMWOptions: {},
  useForumMW: true,
};

export const DEFAULT_KOA_CONFIG: KoaConfig = {
  keys: ['secret local'],
  port: PORT.stableHttpServer.port,
  bodyParserOptions: {
    uploadDir: uploadDirOnCwd,
  },
  mwConfig: {
    ...defaultMwConfig,
    logMWOptions: {
      logBody: {
        maxSize: 1024,
      },
      catchAndWrapError: true,
    },
    staticWMConfig: {
      // staticConfigList: [{dir: '/Users/Shared/assets'}],
      spaConfigList: [
        {
          dir: path.resolve(process.env.HOME, 'code/react/start/browser-feature/react-tsx-less/dist'),
          entries: ['net', 'browser-feature'],
        },
      ],
    },
    socksConfig: SOCKS_SERVER_CONFIG,
  },
  printOrigin: true,
};
