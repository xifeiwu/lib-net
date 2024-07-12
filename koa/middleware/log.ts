import Koa from 'koa';
import {ColorStyle, logColorful, getRandomBase64String, getRequestHeaderInfo} from '../../external';
import {INVALIDATE_PAYLOAD} from './error-catch';

export interface LogMWOptions {
  theme?: ColorStyle;
  prefix?: string;
  logHeaders?: boolean;
  logBody?: {
    maxSize?: number;
  };
  catchAndWrapError?: boolean;
}
export function getLogMiddleware(options: LogMWOptions) {
  const {
    theme = {color: 'yellow'},
    prefix = '->',
    logHeaders = true,
    logBody,
    catchAndWrapError = true,
  } = options;
  return async (ctx: Koa.Context, next: Koa.Next) => {
    const requestId = getRandomBase64String(8);
    const {type, req} = ctx;
    const {method, url, httpVersion, headers} = getRequestHeaderInfo(req);
    // watchSocketState(req.socket, {color: 'blue'});
    logColorful(theme, requestId, [method, url, httpVersion].join(' '));
    if (logHeaders) {
      logColorful({}, headers);
    }
    if (logBody) {
      const {maxSize = 1024} = logBody ?? {};
      new Promise<Buffer>((res, rej) => {
        let byteLength = 0;
        const bufferList: Buffer[] = [];
        req.on('data', (chunk: Buffer) => {
          if (byteLength < maxSize) {
            bufferList.push(chunk);
            byteLength += chunk.byteLength;
          }
        });
        req.on('end', () => {
          res(Buffer.concat(bufferList).subarray(0, maxSize));
        });
        req.on('error', (err: any) => {
          rej(err);
        });
      })
        .then(buf => {
          logColorful(theme, requestId);
          console.log(buf.toString());
          // if (type === 'application/json') {
          //   console.log(buf.toString());
          // }
        })
        .catch(err => {
          console.log(err);
        });
    }
    if (catchAndWrapError) {
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
    } else {
      await next();
    }
  };
}
