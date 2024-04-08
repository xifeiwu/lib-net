import KoaRouter from 'koa-router';
import {getStreamData} from '../../external';

const router = new KoaRouter({
  prefix: '/api/debug',
});

router.all('/echo', async (ctx, next) => {
  const {method, path, query, headers, req} = ctx;
  const {dataType = ''} = query;
  let data: any = '';
  // if (dataType === 'parsed') {
  //   data = await parseBody(req);
  // } else {
  data = (await getStreamData(req)).toString();
  // }
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
