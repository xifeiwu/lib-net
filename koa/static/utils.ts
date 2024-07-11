import fs from 'fs';
import {htmlDirContent} from '../../external';
import {BufferFileInfo, StaticMiddlewareOptions} from './middleware';

export const handleDirByHtmlDirContent: StaticMiddlewareOptions['handleDir'] = (fullpath: string) => {
  const buffer = Buffer.from(htmlDirContent(fullpath));
  return {
    buffer,
    size: buffer.byteLength,
    modifyTime: new Date(),
    contentType: 'html',
    timestamp: Date.now(),
  };
};

export function getPathnameRewriteForSpa(entries: string[]) {
  const pathnameRewrite: StaticMiddlewareOptions['pathnameRewrite'] = (pathname: string) => {
    const target = entries.find(it => {
      return pathname.startsWith('/' + it);
    });
    if (target) {
      return '/' + target + '.html';
    }
    return pathname;
  };
  return pathnameRewrite;
}

function isDirectory(fullpath: string) {
  try {
    const stat = fs.statSync(fullpath);
    return stat.isDirectory();
  } catch (err) {
    return false;
  }
}
/**
 * Check whether dir exist and return
 * @param dirs
 * @returns
 */
export function getDefaultStaticOptionsForDirs(
  fullPathList: string[],
  options?: Omit<StaticMiddlewareOptions, 'dir' | 'handleDir'>
): StaticMiddlewareOptions[] {
  return fullPathList
    .filter(fullpath => {
      isDirectory(fullpath);
    })
    .map(fullpath => {
      return {
        dir: fullpath,
        handleDir: handleDirByHtmlDirContent,
        ...(options ?? {}),
      };
    });
}

export function getDefaultStaticOptionsForSpaDirs(
  configs: {fullpath: string; entries: string[]}[],
  options?: Omit<StaticMiddlewareOptions, 'dir' | 'pathnameRewrite'>
) {
  return configs
    .filter(({fullpath}) => {
      return isDirectory(fullpath);
    })
    .map(({fullpath, entries}) => {
      return {
        dir: fullpath,
        pathnameRewrite: (pathname: string) => {
          const target = entries.find(it => {
            return pathname.startsWith('/' + it);
          });
          if (target) {
            return '/' + target + '.html';
          }
          return pathname;
        },
        ...(options ?? {}),
      };
    });
}
