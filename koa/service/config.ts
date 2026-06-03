import {KoaConfig, KoaMiddlewareConfig} from '../types';
import {uploadDirOnCwd} from '../../service/external';
import {SOCKS_SERVER_CONFIG} from '../middleware/socks/service';

export const defaultMwConfig: KoaMiddlewareConfig = {
  debug: true,
  cors: {},
  logs: {},
  forum: true,
};

export const DEFAULT_KOA_CONFIG: KoaConfig = {
  keys: ['secret local'],
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
      staticConfigList: [],
      spaConfigList: [],
    },
    socks: SOCKS_SERVER_CONFIG,
  },
  printOrigin: true,
};
