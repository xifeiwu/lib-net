import Koa from 'koa';
import {logColorful} from '../../external';

export default function getLogMiddleware(options: {
  prefix?: string;
  showHeaders?: boolean;
  showPayload?: boolean;
  maxRequestDataLength?: number;
}) {
  const {prefix = '->', maxRequestDataLength = 3000, showHeaders = true, showPayload = true} = options;
  return async (ctx: Koa.Context, next: Koa.Next) => {
    const {method = null, href, type, headers, req} = ctx;
    // watchSocketState(req.socket, {color: 'blue'});
    logColorful({color: 'blue'}, `${prefix}${href}`);
    if (showHeaders) {
      console.log(headers);
    }
    if (showPayload) {
      new Promise<Buffer>((res, rej) => {
        const bufferList: Buffer[] = [];
        req.on('data', (chunk: Buffer) => {
          if (bufferList.length < maxRequestDataLength) {
            bufferList.push(chunk);
          }
        });
        req.on('end', () => {
          res(Buffer.concat(bufferList));
        });
        req.on('error', (err: any) => {
          rej(err);
        });
      })
        .then(buf => {
          console.log(`HTTP ${method} ${href}`);
          if (type === 'application/json') {
            console.log(buf.toString());
          }
        })
        .catch(err => {
          console.log(err);
        });
    }
    await next();
  };
}
