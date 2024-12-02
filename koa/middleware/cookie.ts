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

// cookieRouter.get('/switch', async (ctx: Koa.Context) => {
//   const {
//     query: {sid},
//   } = ctx;
//   if (!sid) {
//     throw new Error(`sid is empty`);
//   }
//   ctx.assert(sid, 400, 'sid is emtpy');
//   // ctx.assert()
//   if (Array.isArray(sid)) {
//     throw new Error(`Shouldn't set multiple sid`);
//   }
//   await refreshExpireDate(sid);
//   ctx.cookies.set(DEFAULT_SESSION_CONFIG.key, sid, {signed: true, overwrite: true});
//   ctx.type = 'json';
//   ctx.body = ctx.res.getHeader('set-cookie');
// });