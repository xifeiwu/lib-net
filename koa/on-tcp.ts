import Koa from 'koa';
import {IncomingMessage, ServerResponse} from 'http';
import {
  getResponseData,
  handleSocketEvents,
  parseHttpHeaderPart,
  startSocketServer,
  HttpResponseInfo,
} from '../external';

export const responseInfo: HttpResponseInfo = {
  httpVersion: 'HTTP/1.1',
  statusCode: 200,
  statusMessage: 'OK',
  headers: {
    'content-type': 'application/json',
  },
  data: {
    id: '8fh924b42o',
    text: 'this is a comment',
    createdAt: '2017-04-20T16:19:42.840Z',
    updatedAt: '2017-04-20T16:19:42.840Z',
  },
};

const app = new Koa();
// @ts-ignore
app.use(async (ctx, next) => {
  const {url} = ctx;
  ctx.status = 200;
  ctx.headers['connection'] = 'close';
  if (url.startsWith('/api')) {
    ctx.body = 'response for /api';
    return;
  }
  ctx.body = 'dd';
  // await next();
});

export async function startCustomServer() {
  const {host, port, server} = await startSocketServer(async socket => {
    handleSocketEvents(socket, {
      maxPrintDataLength: 100,
      color: 'red',
      onData: null,
    });
    // socket.on('data', chunk => {
    //   console.log(chunk.toString());
    // });
    // socket.resume
    const req = new IncomingMessage(socket);
    const {requestInfo, dataConsumed} = await parseHttpHeaderPart(socket);
    if (!requestInfo) {
      if (socket.writable) {
        socket.end(getResponseData(responseInfo));
      }
      return;
    }
    req.method = requestInfo.method;
    req.url = requestInfo.url;
    req.httpVersion = requestInfo.httpVersion;
    req.headers = requestInfo.headers;
    const res = new ServerResponse(req);
    res.assignSocket(socket);
    // res.end('ddd');
    // socket.end(getResponseData(responseInfo));
    app.callback()(req, res);
  });
  console.log(`start server: http://${host}:${port}`);
  return {host, port, server};
}
