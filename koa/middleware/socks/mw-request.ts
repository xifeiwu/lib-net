import Koa from 'koa';
import KoaRouter from 'koa-router';
import {infoList, urlPrefix} from './service';
import {toHtml, toUl} from '../../../external';

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
  ctx.type = 'json';
  ctx.body = infoList;
});

router.get('/clear', async (ctx, next) => {
  const {length} = infoList;
  infoList.length = 0;
  ctx.type = 'json';
  ctx.body = length;
});

export const requestMiddleware = router.routes() as Koa.Middleware;
