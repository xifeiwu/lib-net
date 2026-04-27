import {
  getHttpRequestHeaderPartInfo,
  HttpProxyConfig,
  HttpRequestHeaderPartInfo,
  proxyWebSocketRequest,
} from '../../../service/external';
import {UpgradeMiddleware} from '../../types';

export interface ProxyHttpUpgradeMwOptions {
  filter: (headerPart: HttpRequestHeaderPartInfo<'receiver'>) => boolean;
  proxyConfig: HttpProxyConfig;
  rewrite?: (url: string) => string;
  rewriteWsOrigin?: boolean;
}

export function getProxyHttpUpgradeMw(options: ProxyHttpUpgradeMwOptions): UpgradeMiddleware {
  const {filter, proxyConfig, rewrite, rewriteWsOrigin} = options;
  return async (ctx, next) => {
    const {req, socket, head, protocol} = ctx;
    if (protocol !== 'websocket') {
      return await next();
    }

    const headerPart = getHttpRequestHeaderPartInfo(req);
    if (!filter(headerPart)) {
      return await next();
    }

    const originalOrigin = req.headers.origin;
    const originalUrl = req.url;
    if (rewriteWsOrigin) {
      const origin = proxyConfig.globalRequestOptions?.origin;
      if (origin) {
        req.headers.origin = origin;
      }
    }
    if (rewrite && req.url) {
      req.url = rewrite(req.url);
    }

    try {
      await proxyWebSocketRequest(req, socket, head, proxyConfig);
    } finally {
      req.headers.origin = originalOrigin;
      req.url = originalUrl;
    }
  };
}
