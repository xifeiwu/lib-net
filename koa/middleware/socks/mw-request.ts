import Koa from 'koa';
import KoaRouter from 'koa-router';
import {infoList, urlPrefix} from './service';
import {isNumber, toHtml, toUl} from '../../../service/external';

const router = new KoaRouter({
  prefix: urlPrefix,
});

router.get('/', async (ctx, next) => {
  ctx.type = 'html';
  ctx.body = toHtml(
    toUl(
      [
        {href: '/list', content: '/list'},
        {href: '/clear', content: '/clear'},
      ].map(it => {
        const {href} = it;
        return {
          ...it,
          href: urlPrefix + href,
        };
      })
    )
  );
});

router.get('/list', async (ctx, next) => {
  const {query} = ctx;
  const sizeStr = Array.isArray(query?.size) ? query.size[0] : query.size;
  const size = parseInt(sizeStr);
  ctx.type = 'json';
  let result = infoList;
  if (isNumber(size)) {
    result = result.slice(0, size);
  }
  ctx.body = result;
});

router.get('/clear', async (ctx, next) => {
  const {length} = infoList;
  infoList.length = 0;
  ctx.type = 'json';
  ctx.body = length;
});

export const requestMiddleware = router.routes() as Koa.Middleware;
