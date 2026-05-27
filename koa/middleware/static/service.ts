import fs from 'fs';
import {htmlDirContent, isFunction, isHtmlRequest, isObject} from '../../../service/external';
import {
  FallbackUrlFunc,
  KoaSpaConfig,
  KoaStaticConfig,
  KoaStaticDefaultOptions,
  SimplifiedRequestInfo,
} from './types';

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
      const distFile = entryToDistFile[key] ?? entryToDistFile['/' + key];
      if (distFile) {
        return `/${distFile}${qs}`;
      }
    }
    return undefined;
  };
  return getFallbackUrl;
};

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
    return fallbackUrl[pathname];
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
  const {entries, fallbackUrl, ...rest} = config;
  if (!Array.isArray(entries) || entries.length === 0) {
    return config;
  }
  const getSpaPathFallback = getFallbackUrlFuncByEntryMap(entries);
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
