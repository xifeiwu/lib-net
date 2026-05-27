import {Readable} from 'stream';

export interface HttpHeaderConfig {
  maxAge?: number;
  cacheControl?: string;
}

interface CommonInfo extends HttpHeaderConfig {
  size: number;
  modifyTime: Date;
  md5?: string;
  timestamp: number;
}

export interface LocalFileInfo extends CommonInfo {
  /** fullpath for local file, buffer for generated file */
  fullPath: string;
  extName: string;
}

export interface BufferFileInfo extends CommonInfo {
  buffer: Buffer;
  contentType: string;
}

export interface SimplifiedRequestInfo {
  headers: {accept?: string | string[]};
  method?: string;
  url?: string;
}

export type StaticFileInfo = LocalFileInfo | BufferFileInfo;

export type FallbackUrlFunc = (req: SimplifiedRequestInfo) => string;
export type FallbackUrlMap = {
  [pathname: string]: string;
};
export interface KoaStaticConfig {
  /** target static dir */
  dir: string;
  /** urlPrefix will be replace to '' whne found a file by pathname */
  urlPrefix?: string;
  store?: Map<string, StaticFileInfo>;
  /** enable gzip or not */
  enableGzip?: boolean;
  /**
   * alias a pathname to another name in the same dir before load file
   * pathname passed to fallbackUrlFunc is relative to urlPrefix, and should have leading slash and no trailing slash
   * example:
   * urlPrefix: '/static',
   * fallbackUrl: {
   *   '/index': '/index.html',
   * }
   * pathname: '/static/index'
   * will be replaced to '/static/index.html'
   */
  fallbackUrl?: FallbackUrlMap | FallbackUrlFunc;
  /** when the target path point to is dir, how to handle it */
  handleDir?: (fullpath: string) => BufferFileInfo;
  /** return a customized contentType from origin contentType */
  customContentType?: (fileInfo: LocalFileInfo) => string | undefined;
  /** handle original file/dir data and return new data */
  postTreatData?: (stream: Readable, fileInfo: StaticFileInfo) => Readable;
  /** The max time get data from cache */
  maxCacheTime?: number;
}

export type KoaStaticDefaultOptions = Omit<KoaStaticConfig, 'dir'>;

export interface KoaSpaConfig extends KoaStaticConfig {
  entryToDistFile: Record<string, string>;
}
