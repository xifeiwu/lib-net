import Koa from 'koa';
import KoaRouter from 'koa-router';
import {
  TcpHttpRequestProps,
  getRequestInfo,
  getDataFromReadable,
  isNumber,
  toNumber,
  waitFor,
  parseBody,
  ParserOptions,
  toUrlProps,
} from '../../external';
import {urlPrefix} from './service';
import {broadcastData, wsConnections} from './middleware-ws';
import {NormalizedUrlProps} from '../../../fe';
import {Action4IncomingMessage, handleIncomingMessageByConfig} from '../../../node';

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
  const reqData = await getDataFromReadable(req);
  if (reqData.byteLength > 0) {
    resData.data = reqData.toString();
  }
  await handleIncomingMessageByConfig({request: ctx.req, response: ctx.res}, query as Action4IncomingMessage);
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

export const debugMiddleware = router.routes();
