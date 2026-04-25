import Koa from 'koa';
import {
  proxyHttpRequest,
  ProxyStatus,
  getPreRequestCb,
  getHttpRequestHeaderPartInfo,
  HttpProxyConfig,
  HttpRequestHeaderPartInfo,
} from '../../service/external';
import {getRequestBodyOfCtx} from '../service';

export const getProxyKoaMw = (params: {
  filter: (headerPart: HttpRequestHeaderPartInfo<'receiver'>) => boolean;
  proxyConfig: HttpProxyConfig;
  options?: {proxyStatusList?: ProxyStatus[]};
}): Koa.Middleware => {
  const {filter, proxyConfig, options} = params;
  const {proxyStatusList} = options ?? {};

  /**
   * if proxyStatusList is provided, use it to get the preProxyReq callback
   */
  const preProxyReqByStatusList = proxyStatusList
    ? getPreRequestCb({statusList: proxyStatusList})
    : undefined;

  return async (ctx: Koa.Context, next: Koa.Next) => {
    const headerPart = getHttpRequestHeaderPartInfo(ctx.req);
    if (!filter(headerPart)) {
      return await next();
    }
    const originData = await getRequestBodyOfCtx(ctx);
    ctx.respond = false;

    const mergedPreProxyReq = preProxyReqByStatusList
      ? (status: ProxyStatus, moreInfo: {href: string}) => {
          preProxyReqByStatusList(status, moreInfo);
          proxyConfig.preProxyReq?.(status, moreInfo);
        }
      : proxyConfig.preProxyReq;

    proxyHttpRequest(ctx.req, ctx.res, {
      ...proxyConfig,
      originData,
      preProxyReq: mergedPreProxyReq,
    });
  };
};
