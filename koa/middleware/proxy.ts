import Koa from 'koa';
import {
  FilterItem,
  getPreRequestCb,
  HttpRequestOptions,
  isString,
  matchFilters,
  postResToProxy,
  proxyHttpRequest,
  ProxyStatus,
  cacheData,
} from '../../service/external';
import {getRequestBodyOfCtx} from '../service';

export const getProxyKoaMw = (proxyConfig: {
  /** only do proxy when request meet context filter */
  contextFilterList?: FilterItem[];
  /**
   * The options should be add to requestOptions of every proxy request,
   * it can be constant of dynamic(in format of function) value
   */
  globalRequestOptions?: {
    get: () => Promise<HttpRequestOptions>;
    maxAge?: number;
  };
  proxyStatusList?: ProxyStatus[];
}) => {
  const {contextFilterList, globalRequestOptions, proxyStatusList} = proxyConfig;
  const {getOrFetch: getOrFetchGlobalRequestOptions} = cacheData<HttpRequestOptions>(
    {maxAge: globalRequestOptions?.maxAge},
    globalRequestOptions.get
  );
  return async (ctx: Koa.Context, next: Koa.Next) => {
    const {path: pathname} = ctx;
    if (!matchFilters(contextFilterList, pathname)) {
      return await next();
    }
    const originData = await getRequestBodyOfCtx(ctx);
    const globalRequestOptions = await getOrFetchGlobalRequestOptions();
    ctx.respond = false;
    proxyHttpRequest(ctx.req, ctx.res, {
      originData,
      globalRequestOptions,
      async handleProxyRequestOptions(info) {
        delete info?.headers['host'];
        delete info?.headers['referer'];
        return info;
      },
      preProxyReq: getPreRequestCb({
        statusList: proxyStatusList,
      }),
      postResToProxy,
      async handleResponseInfoToOrigin(info) {
        const {headers, ...restProps} = info;
        for (let [key, value] of Object.entries(headers)) {
          /** ignore cors related headers */
          if (isString(key) && key.toLowerCase().startsWith('access-control-')) {
            delete headers[key];
          }
        }
        /** Add proxy info to httpResponseInfo to origin */
        for (const [key, value] of Object.entries({
          origin: globalRequestOptions?.origin,
        })) {
          if (value !== undefined) {
            headers[`z-mitm-proxy-${key}`] = value;
          }
        }
        return {
          ...restProps,
          headers,
        };
      },
    });
  };
};
