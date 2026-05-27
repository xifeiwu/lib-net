import fs from 'fs';
import {formatPathname, htmlDirContent, isFunction, isHtmlRequest, isObject} from '../../../service/external';
import {
  FallbackUrlFunc,
  KoaSpaConfig,
  KoaStaticConfig,
  KoaStaticDefaultOptions,
  SimplifiedRequestInfo,
} from './types';

function getUnifiedPathnameList(pathname: string) {
  const v1 = formatPathname(pathname, {leadingSlash: false, trailingSlash: false});
  return [v1, '/' + v1];
}

/**
 * show directory content in html format
 * @param fullpath static dir path
 * @returns buffer content of html format
 */
export const showDirContentInHtmlFormat: KoaStaticConfig['handleDir'] = (fullpath: string) => {
  const buffer = Buffer.from(htmlDirContent(fullpath));
  return {
    buffer,
    size: buffer.byteLength,
    modifyTime: new Date(),
    contentType: 'html',
    timestamp: Date.now(),
  };
};

/**
 * TODO: is qs unnecessary for static file request???
 * @param url its value is req.url, origin part is not included
 * @returns
 */
export function parseUrl(url: string) {
  const q = url.indexOf('?');
  const pathname = q === -1 ? url : url.slice(0, q);
  const qs = q === -1 ? '' : url.slice(q);
  return {pathname, qs};
}

/**
 * Return a fallbackUrl function for spa page by entry name to dist file name map
 * @param entryToDistFile entry name to dist file name map     entry name like '/foo/bar/baz' will be mapped to dist file name like 'foo.html'
 * @returns
 */
export const getFallbackUrlFuncByEntryMap: (entryToDistFile: Record<string, string>) => FallbackUrlFunc = (
  entryToDistFile: Record<string, string>
) => {
  const getFallbackUrl: FallbackUrlFunc = (req): string | undefined => {
    if (!isHtmlRequest(req)) return undefined;
    const {pathname, qs} = parseUrl(req.url ?? '');
    const parts = pathname.split('/').filter(Boolean);
    for (let i = parts.length; i >= 1; i--) {
      const key = parts.slice(0, i).join('/');
      const [key1, key2] = getUnifiedPathnameList(key);
      const distFile = entryToDistFile[key1] ?? entryToDistFile[key2];
      if (distFile) {
        return `/${distFile}${qs}`;
      }
    }
    return undefined;
  };
  return getFallbackUrl;
};

export function toSimplifiedRequestInfo(req: SimplifiedRequestInfo): SimplifiedRequestInfo {
  return {
    headers: req.headers,
    method: req.method,
    url: req.url,
  };
}
/**
 * Its a wrapper function for fallbackUrl: get fallback url by fallbackUrl function or fallbackUrl map
 * @param req its value is ctx.req, origin part is not included
 * @param fallbackUrl
 * @returns fallback url
 */
export function getFallbackUrl(
  req: SimplifiedRequestInfo,
  fallbackUrl?: KoaStaticConfig['fallbackUrl']
): string | undefined {
  if (!fallbackUrl) return undefined;
  if (isFunction(fallbackUrl)) {
    return (fallbackUrl as Function)(req);
  } else if (isObject(fallbackUrl)) {
    const {pathname, qs} = parseUrl(req.url ?? '');
    const [key1, key2] = getUnifiedPathnameList(pathname);
    return fallbackUrl[key1] ?? fallbackUrl[key2];
  }
}

/**
 * append pathnameRewrite function for spa entry pages
 * @param config spa config
 * @param defaultOptions default options
 * @returns static config with pathnameRewrite function
 */
export function spaConfigToStaticConfig(
  config: KoaSpaConfig,
  defaultOptions?: KoaStaticDefaultOptions
): KoaStaticConfig {
  const {entryToDistFile, fallbackUrl, ...rest} = config;
  if (!entryToDistFile || Object.keys(entryToDistFile).length === 0) {
    return config;
  }
  const getSpaPathFallback = getFallbackUrlFuncByEntryMap(entryToDistFile);
  /**
   * find spa entry fallback url first, if not found, use fallbackUrl function or fallbackUrl map
   * @param req its value is ctx.req, origin part is not included
   * @returns fallback url
   */
  const finalPathnameRewrite: FallbackUrlFunc = req => {
    const result = getSpaPathFallback(req) ?? getFallbackUrl(req, fallbackUrl);
    return result;
  };
  return {
    fallbackUrl: finalPathnameRewrite,
    ...(defaultOptions ?? {}),
    ...rest,
  };
}
