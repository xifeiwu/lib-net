import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import Koa from 'koa';
import {Readable} from 'stream';
import {toReadable, mime, getFileList, isNumber, formatPathname} from '../../../service/external';
import {BufferFileInfo, HttpHeaderConfig, LocalFileInfo, StaticFileInfo, KoaStaticConfig} from './types';
import {getFallbackUrl, parseUrl, toSimplifiedRequestInfo} from './service';

/**
 * A middleware of koa for handle static files under a target folder.
 * 1. the static middleware will have great impact on route when urlPrefix is not set,
 *    because for each unmatched request, the static middleware will be called to search the file by pathname.
 * 2. Take care about sequence or position of static middleware.
 * 3. the static middleware will not handle the request if the request is not HEAD or GET.
 */
export function getStaticKoaMw(options: KoaStaticConfig) {
  let {
    dir,
    store,
    enableGzip = false,
    fallbackUrl,
    handleDir,
    postTreatData,
    customContentType,
    maxCacheTime = 0,
  } = options;

  const getContentType = (fileInfo: LocalFileInfo | BufferFileInfo) => {
    if (customContentType && (fileInfo as LocalFileInfo).extName) {
      const contentType = customContentType(fileInfo as LocalFileInfo);
      if (contentType) {
        return contentType;
      }
    }
    // @ts-ignore
    const {extName, contentType} = fileInfo;
    return extName || contentType || 'application/octet-stream';
  };

  dir = path.normalize(dir);
  if (!fs.existsSync(dir)) {
    throw new Error(`dir ${dir} not exist!`);
  }
  if (!fs.statSync(dir).isDirectory()) {
    throw new Error(`dir ${dir} is not a directory!`);
  }

  /** urlPrefix should have leading slash and no trailing slash */
  const urlPrefix =
    options.urlPrefix !== undefined
      ? formatPathname(options.urlPrefix, {leadingSlash: true, trailingSlash: false})
      : undefined;

  const fileStore = store ? store : new Map();

  return async (ctx: Koa.Context, next: Koa.Next) => {
    // only accept HEAD and GET
    if (ctx.method !== 'HEAD' && ctx.method !== 'GET') {
      return await next();
    }
    /**
     * pre handle url:
     * 1. decode `/%E4%B8%AD%E6%96%87` to `/中文`
     * 2. normalize for `//index`
     */
    let url = path.normalize(safeDecodeURIComponent(ctx.url));
    // check prefix first to avoid calculate
    if (urlPrefix && url.indexOf(urlPrefix) !== 0) {
      return await next();
    }
    if (urlPrefix !== undefined) {
      url = url.replace(urlPrefix, '');
    }
    let pathname = parseUrl(url).pathname;
    if (fallbackUrl) {
      const finalUrl = getFallbackUrl({...toSimplifiedRequestInfo(ctx.req), url: url}, fallbackUrl);
      if (finalUrl) {
        pathname = parseUrl(finalUrl).pathname;
      }
    }
    const relativePath = formatPathname(pathname, {leadingSlash: false, trailingSlash: false});

    const fullpath = path.join(dir, relativePath);
    let fileInfo = fileStore.get(relativePath);
    // try to load file
    if (!fileInfo) {
      // files that can be accessd should be under options.dir
      // if (fullpath.indexOf(dir) !== 0) {
      //   return await next();
      // }
      if (!fs.existsSync(fullpath)) {
        return await next();
      }

      const stat = fs.statSync(fullpath);
      /** only support file or directory */
      if (!stat.isFile() && !stat.isDirectory()) {
        return await next();
      }

      const _fileInfo = getFileInfo(fullpath, {handleDir});
      if (_fileInfo) {
        fileStore.set(relativePath, _fileInfo);
        fileInfo = _fileInfo;
      }
    } else {
      /** check whether fullpath exist in local storage */
      if (!fs.existsSync(fullpath)) {
        fileStore.delete(fullpath);
        return await next();
      }
      if (!isNumber(maxCacheTime) || (fileInfo.timestamp ?? 0) + maxCacheTime < Date.now()) {
        const _fileInfo = getFileInfo(fullpath, {handleDir});
        if (_fileInfo) {
          fileStore.set(relativePath, _fileInfo);
          fileInfo = _fileInfo;
        }
      }
    }
    if (!fileInfo) {
      return await next();
    }

    ctx.status = 200;

    if (enableGzip) {
      ctx.vary('Accept-Encoding');
    }

    ctx.response.lastModified = fileInfo.modifyTime;
    if (fileInfo.md5) {
      ctx.response.etag = fileInfo.md5;
    }

    if (ctx.fresh) {
      return (ctx.status = 304);
    }

    ctx.type = getContentType(fileInfo);
    // should not set length as it may be compressed later
    // ctx.length = file.size;
    ctx.set('cache-control', fileInfo.cacheControl || 'public, max-age=' + (fileInfo.maxAge || 0));
    if (fileInfo.md5) {
      ctx.set('content-md5', fileInfo.md5);
    }

    if (ctx.method === 'HEAD') {
      return;
    }

    const acceptGzip = ctx.acceptsEncodings('gzip') === 'gzip';

    const shouldGzip =
      enableGzip && fileInfo.size > 1024 && acceptGzip && mime.compressible(getContentType(fileInfo));

    let reader: Readable;
    if ((fileInfo as LocalFileInfo).fullPath) {
      reader = fs.createReadStream((fileInfo as LocalFileInfo).fullPath);
    } else if (fileInfo as BufferFileInfo) {
      reader = toReadable((fileInfo as BufferFileInfo).buffer);
    }
    if (postTreatData) {
      reader = postTreatData(reader, fileInfo);
    }

    // enable gzip will remove content length
    if (shouldGzip) {
      ctx.remove('content-length');
      ctx.set('content-encoding', 'gzip');
      ctx.body = reader.pipe(zlib.createGzip());
    } else {
      ctx.body = reader;
    }
  };
}

function safeDecodeURIComponent(text: string) {
  try {
    return decodeURIComponent(text);
  } catch (e) {
    return text;
  }
}

const FILE_SIZE_THRESHOLD = 1024 * 1024;

/**
 * Get file related info except file data, as file data will consume lots of memory
 * @param fullPath
 * @param option
 * @param headerConfig config for http header
 * @returns
 */
export function getFileInfo(
  fullPath: string,
  option: {
    /** return content of buffer when path points to a directory */
    handleDir?: KoaStaticConfig['handleDir'];
  } = {},
  headerConfig?: HttpHeaderConfig
): StaticFileInfo | null {
  if (!fs.existsSync(fullPath)) {
    console.error(`file ${fullPath} not exist`);
    return null;
  }
  const {handleDir} = option;
  const stats = fs.statSync(fullPath);
  if (stats.isFile()) {
    const extName = path.extname(fullPath);
    return {
      fullPath,
      size: stats.size,
      modifyTime: stats.mtime,
      extName,
      timestamp: Date.now(),
      ...(headerConfig ? headerConfig : {}),
    };
  } else if (stats.isDirectory() && handleDir) {
    return handleDir(fullPath);
  }
  return null;
}

export function preLoadDir(
  store: Map<string, StaticFileInfo>,
  dirInfo: {
    fullPath: string;
    includeDir?: boolean;
    // dirFilter?: (fullpath: string) => boolean;
    // fileFilter?: (fullpath: string) => boolean;
  },
  urlPrefix: string
) {
  if (!urlPrefix) {
    urlPrefix = '';
  }
  const {fullPath, includeDir} = dirInfo;
  if (!fs.existsSync(fullPath)) {
    throw new Error(`dir "${fullPath}" not exist`);
  }
  const stat = fs.statSync(fullPath);
  if (!stat.isDirectory()) {
    throw new Error(`dir "${fullPath}" is not a directory`);
  }
  getFileList(fullPath, {
    includeDir,
  }).forEach(relPath => {
    const fileInfo = getFileInfo(path.join(fullPath, relPath));
    if (fileInfo) {
      store.set(path.join(urlPrefix, relPath), fileInfo);
    }
  });
}
