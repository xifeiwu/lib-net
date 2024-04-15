import KoaRouter from 'koa-router';
import {getStreamData, isNumber, toInt, waitFor} from '../../external';

const router = new KoaRouter({
  prefix: '/api/debug',
});

export interface EchoConfig {
  /** delay response in seconds */
  delay?: number;
}

router.all('/echo', async (ctx, next) => {
  const {method, path, query, headers, req} = ctx;
  const data = (await getStreamData(req)).toString();
  /** Setting echo config in query other than payload to make sure it is usable for both GET and POST  */
  let {delay} = (query ?? {}) as EchoConfig;
  if (delay) {
    delay = toInt(delay);
    if (isNumber(delay)) {
      await waitFor(delay * 1000);
    }
  }
  ctx.body = {
    method,
    path,
    httpVersion: req.httpVersion,
    query,
    headers,
    data,
  };
});

router.all('/error', async (ctx, next) => {
  ctx.throw(`error from server`, 500);
});

const middlewareDebug = router.routes();

export default middlewareDebug;
