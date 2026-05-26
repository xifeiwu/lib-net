import fs from 'fs';
import {htmlDirContent} from '../../../service/external';
import {StaticMWConfig} from '../../types';
import {KoaSpaConfig, KoaStaticConfig, KoaStaticDefaultOptions} from './types';

export const handleDirByHtmlDirContent: KoaStaticConfig['handleDir'] = (fullpath: string) => {
  const buffer = Buffer.from(htmlDirContent(fullpath));
  return {
    buffer,
    size: buffer.byteLength,
    modifyTime: new Date(),
    contentType: 'html',
    timestamp: Date.now(),
  };
};

function isDirectory(dir: string) {
  try {
    const stat = fs.statSync(dir);
    return stat.isDirectory();
  } catch (err) {
    return false;
  }
}

export function toStaticMiddlewareOptions(
  config: KoaStaticConfig,
  defaultOptions?: KoaStaticDefaultOptions
): KoaStaticConfig {
  const {dir, ...rest} = config;
  return {
    dir,
    handleDir: handleDirByHtmlDirContent,
    ...(defaultOptions ?? {}),
    ...rest,
  };
}

export function toSpaStaticMiddlewareOptions(
  config: KoaSpaConfig,
  defaultOptions?: KoaStaticDefaultOptions
): KoaStaticConfig {
  const {dir, entries, ...rest} = config;
  return {
    dir,
    pathnameRewrite: (pathname: string) => {
      const target = entries.find(it => {
        return pathname.startsWith('/' + it);
      });
      if (target) {
        return '/' + target + '.html';
      }
      return pathname;
    },
    ...(defaultOptions ?? {}),
    ...rest,
  };
}

export function toKoaStaticConfigList(staticMWConfig: StaticMWConfig): KoaStaticConfig[] {
  const {defaultOptions, staticConfigList = [], spaConfigList = []} = staticMWConfig;
  const spaOptionsList = spaConfigList
    .filter(({dir}) => isDirectory(dir))
    .map(config => toSpaStaticMiddlewareOptions(config, defaultOptions));
  const staticOptionsList = staticConfigList
    .filter(({dir}) => isDirectory(dir))
    .map(config => toStaticMiddlewareOptions(config, defaultOptions));
  return [...spaOptionsList, ...staticOptionsList];
}
