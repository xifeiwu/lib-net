import Koa from 'koa';
import KoaRouter from 'koa-router';
import {urlPrefix} from './service';
import {broadcastData, wsConnections} from './mw-upgrade';
import {
  TcpHttpRequestProps,
  getRequestInfo,
  parseBody,
  ParserOptions,
  toUrlProps,
  NormalizedUrlProps,
  CustomHandleRequestOptions,
  customHandleRequest,
  isPlainObject,
  fromBuffer,
} from '../../../external';

export interface EchoConfig {
  /** delay response in seconds */
  delay?: number;
}

const router = new KoaRouter({
  prefix: urlPrefix,
});

router.all('/echo', async (ctx, next) => {
  const {method, url, headers, req} = ctx;
  const {query, pathname} = toUrlProps(url);
  const resData: TcpHttpRequestProps & NormalizedUrlProps = {
    method,
    url,
    httpVersion: req.httpVersion,
    headers,
    pathname,
    query,
  };
  // const reqData = await getDataFromReadable(req);
  const reqData = await parseBody(ctx.req);
  const isJson = isPlainObject(reqData);
  if (isJson) {
    const {actionConfig} = reqData ?? {};
    const mergedActionConfig: CustomHandleRequestOptions = Object.assign(
      actionConfig ?? {},
      query ?? {}
    ) as CustomHandleRequestOptions;
    await customHandleRequest({request: ctx.req, response: ctx.res}, mergedActionConfig);
    if (mergedActionConfig.responseCode) {
      ctx.status = ctx.res.statusCode;
    }
  }
  if (reqData) {
    resData.data = isJson ? reqData : fromBuffer(reqData, 'json');
  }

  ctx.body = resData;
});

router.all('/error', async (ctx, next) => {
  ctx.throw(`error from server`, 500);
});

/**
 * broadcast data to all websocket client connected.
 * curl -X POST http://127.0.0.1:3180/api/debug/ws/broadcast -d the-data
 */
router.post('/ws/broadcast', async ctx => {
  const requestInfo = await getRequestInfo(ctx.req);
  broadcastData(requestInfo.data);
  ctx.status = 200;
  ctx.body = {
    receiver: wsConnections(),
  };
});
/**
 * Get info of each websocket connection
 * curl http://127.0.0.1:3180/api/debug/ws/connections
 */
router.get('/ws/connections', async ctx => {
  const requestInfo = await getRequestInfo(ctx.req);
  ctx.body = wsConnections();
});

const uploadMiddleware: Koa.Middleware = async ctx => {
  const parseOptionsFromQuery = ctx.query as Partial<ParserOptions>;
  const {bodyParserOptions} = ctx;
  ctx.body = await parseBody(ctx.req, {
    ...bodyParserOptions,
    ...parseOptionsFromQuery,
  });
};
router.all('/upload', uploadMiddleware);

export const requestMiddleware = router.routes() as Koa.Middleware;
