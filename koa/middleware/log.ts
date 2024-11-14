/**
 * Should be set as first middleware:
 * Log request info, wrap error message
 */
import Koa from 'koa';
import {
  ColorStyle,
  logColorful,
  getRandomBase64String,
  getHttpRequestHeaderPartInfo,
  toBuffer,
  CanConvertToBuffer,
  getSocketInfo,
} from '../../external';
export const INVALIDATE_PAYLOAD = 'invalidate payload';

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
    theme = {color: 'blue'},
    prefix = '->',
    logHeaders = true,
    logBody,
    catchAndWrapError = true,
  } = options;
  return async (ctx: Koa.Context, next: Koa.Next) => {
    const startTime = Date.now();
    const requestId = getRandomBase64String(8);
    const {type, req, socket} = ctx;
    const {method, url, httpVersion, headers} = getHttpRequestHeaderPartInfo(req);
    logColorful(
      theme,
      `${requestId}[${getSocketInfo(socket).id}] Header`,
      [method, url, httpVersion].join(' ')
    );
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
          logColorful(theme, `${requestId} Body`);
          logColorful({}, buf.toString());
          // if (type === 'application/json') {
          //   console.log(buf.toString());
          // }
        })
        .catch(err => {
          console.log(err);
        });
    }
    try {
      await next();
    } catch (err) {
      if (catchAndWrapError) {
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
    } finally {
      const responseBody = toBuffer(ctx.body as CanConvertToBuffer);
      let length = -1;
      if (Buffer.isBuffer(responseBody)) {
        length = responseBody.byteLength;
      }
      logColorful(theme, `${requestId} End`);
      logColorful(
        {},
        {
          timeCost: Date.now() - startTime,
          status: ctx.status,
          headers: {...ctx.res.getHeaders()},
          length,
          data: length > 0 ? responseBody.subarray(0, 256).toString() : '',
        }
      );
    }
  };
}
