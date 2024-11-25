import KoaRouter from 'koa-router';
import {Cookies} from '../../service/external';

export const cookieRouter = new KoaRouter({
  prefix: '/api/cookie',
});

cookieRouter.get('/list', async (ctx, next) => {
  ctx.type = 'json';
  const cookies = new Cookies(ctx.req, ctx.res);
  ctx.body = cookies.getAll();
});
