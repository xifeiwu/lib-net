import path from 'path';
import {KoaConfig, KoaMiddlewareConfig} from '../types';
import {PORT, uploadDirOnCwd} from '../../service/external';
import {SOCKS_SERVER_CONFIG} from '../middleware/socks/service';

export const mwConfigDefault: KoaMiddlewareConfig = {
  useDebugMW: true,
  corsWMOptions: {},
  logsMWOptions: {},
  useForumMW: true,
};

export const KOA_CONFIG: KoaConfig = {
  keys: ['secret local'],
  port: PORT.fullFeatureHttpServer.port,
  bodyParserOptions: {
    uploadDir: uploadDirOnCwd,
  },
  mwConfig: {
    ...mwConfigDefault,
    logMWOptions: {
      logBody: {
        maxSize: 1024,
      },
      catchAndWrapError: true,
    },
    staticWMConfig: {
      spaDirList: [
        {
          fullpath: path.resolve(process.env.HOME, 'code/react/start/browser-feature/react-tsx-less/dist'),
          entries: ['net', 'browser-feature'],
        },
      ],
    },
    socksConfig: SOCKS_SERVER_CONFIG,
  },
  printOrigin: true,
};
