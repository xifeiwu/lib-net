import path from 'path';
import {KoaConfig, KoaMiddlewareConfig} from '../types';
import {PORT, uploadDirOnCwd} from '../../service/external';
import {SOCKS_SERVER_CONFIG} from '../middleware/socks/service';

export const defaultMwConfig: KoaMiddlewareConfig = {
  debug: true,
  cors: {},
  logs: {},
  forum: true,
};

export const DEFAULT_KOA_CONFIG: KoaConfig = {
  keys: ['secret local'],
  port: PORT.stableHttpServer.port,
  bodyParserOptions: {
    uploadDir: uploadDirOnCwd,
  },
  mwConfig: {
    ...defaultMwConfig,
    log: {
      logBody: {
        maxSize: 1024,
      },
      catchAndWrapError: true,
    },
    static: {
      staticConfigList: [
        {dir: path.join(process.env.HOME, 'code/huffie/xifeiwu.github.io'), urlPrefix: '/resume'},
      ],
      spaConfigList: [
        {
          dir: path.resolve(process.env.HOME, 'code/react/start/browser-feature/react-tsx-less/dist'),
          entries: ['net', 'browser-feature'],
        },
      ],
    },
    socks: SOCKS_SERVER_CONFIG,
  },
  printOrigin: true,
};
