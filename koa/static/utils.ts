import {htmlDirContent} from '../../external';
import {BufferFileInfo, StaticMiddlewareOptions} from './middleware';

const showDirContent: StaticMiddlewareOptions['handleDir'] = (fullpath: string) => {
  const buffer = Buffer.from(htmlDirContent(fullpath));
  return {
    buffer,
    size: buffer.byteLength,
    modifyTime: new Date(),
    contentType: 'html',
    timestamp: Date.now(),
  };
};

export function getOptionsForStaticDir(options: StaticMiddlewareOptions) {
  const mergedOptions: StaticMiddlewareOptions = {
    ...options,
    handleDir: showDirContent,
  };
  return mergedOptions;
}

export function getOptionsForSpaDir(options: StaticMiddlewareOptions, otherOptions: {entries: string[]}) {
  const {entries} = otherOptions;
  return {
    ...options,
    pathnameRewrite: (pathname: string) => {
      const target = entries.find(it => {
        return pathname.startsWith('/' + it);
      });
      if (target) {
        return '/' + target + '.html';
      }
      return pathname;
    },
  };
}
