import KoaRouter from 'koa-router';
import {
  TcpHttpRequestProps,
  TcpHttpResponseProps,
  getRequestInfo,
  getDataFromReadable,
  isNumber,
  toInt,
  waitFor,
} from '../../external';
import {urlPrefix} from './service';
import {broadcastData, wsConnections} from './handle-upgrade';

const router = new KoaRouter({
  prefix: urlPrefix,
});

export interface EchoConfig {
  /** delay response in seconds */
  delay?: number;
}

router.all('/echo', async (ctx, next) => {
  const {method, url, query, headers, req} = ctx;
  const resData: TcpHttpRequestProps = {
    method,
    url,
    httpVersion: req.httpVersion,
    // query,
    headers,
  };
  const reqData = await getDataFromReadable(req);
  if (reqData.byteLength > 0) {
    resData.data = reqData.toString();
  }
  /** Setting echo config in query other than payload to make sure it is usable for both GET and POST  */
  let {delay} = (query ?? {}) as EchoConfig;
  if (delay) {
    delay = toInt(delay);
    if (isNumber(delay)) {
      await waitFor(delay * 1000);
    }
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

export const middlewareDebug = router.routes();
