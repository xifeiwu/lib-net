import Koa from 'koa';

export const INVALIDATE_PAYLOAD = 'invalidate payload';

export interface ErrorBody {
  url: string;
  message: string;
  [name: string]: any;
}
/**
 * @deprecated replaced by log middleware
 * @param ctx
 * @param next
 */
const errorCatchMiddleware: Koa.Middleware = async (ctx: Koa.Context, next) => {
  try {
    await next();
  } catch (err) {
    const {url} = ctx;
    /** Error of async-validator */
    if (err.errors && err.fields) {
      const {
        errors: [firstError],
        fields,
      } = err;
      // ctx.throw(fields, 400);
      ctx.status = 400;
      ctx.type = 'json';
      ctx.body = {url, message: INVALIDATE_PAYLOAD, fields};
    } else {
      const message = err.message;
      ctx.status = 505;
      ctx.body = {
        url,
        message,
      };
      // ctx.throw({url, message}, 400);
    }
  }
};

export default errorCatchMiddleware;
