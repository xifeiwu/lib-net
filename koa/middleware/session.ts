/**
 * This a general functionality for session based on any storage engine
 * As some loigc based on storage engine, such as:
 * findAll, refresh
 */
import KoaRouter from 'koa-router';

/**
 * Not set prefix here, as it must be extended by other router that has full feature
 */
export const sessionRouter = new KoaRouter({
  // prefix: '/api/session',
});
sessionRouter.get('/visit', async (ctx, next) => {
  const visitCount = ctx.session.visitCount ?? 0;
  ctx.session.visitCount = visitCount + 1;
  ctx.session.lastVisit = new Date().toLocaleDateString();
  ctx.type = 'json';
  const json = ctx.session.toJSON();
  ctx.body = json;
});

sessionRouter.get('/info', async (ctx, next) => {
  ctx.type = 'json';
  ctx.body = ctx.session;
});
