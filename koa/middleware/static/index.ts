export {getStaticKoaMw, getFileInfo, preLoadDir} from './middleware';
export {
  KoaSpaConfig,
  KoaStaticConfig,
  KoaStaticDefaultOptions,
  StaticFileInfo,
  LocalFileInfo,
  BufferFileInfo,
} from './types';
export {
  handleDirByHtmlDirContent,
  toStaticMiddlewareOptions,
  toSpaStaticMiddlewareOptions,
  toKoaStaticConfigList as resolveStaticMiddlewareOptionsList,
} from './utils';
