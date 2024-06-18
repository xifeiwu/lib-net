import Koa from 'koa';
import assert from 'assert';
import {
  handleSocketEvents,
} from '../external';
import {startTcpServer} from './on-tcp';
import {requestAndGetResponseInfo, startSocketClient} from '../../node';

export async function testLogic() {
  const httpBlankBody = 'blank';
  let connectionCnt = 0;

  const app = new Koa();
  app.use(async (ctx, next) => {
    const {url} = ctx;
    if (url.startsWith('/api')) {
      ctx.status = 200;
      ctx.body = connectionCnt;
    } else {
      await next();
    }
  });
  app.use(async ctx => {
    ctx.status = 404;
    ctx.body = httpBlankBody;
  });
  const {host, port, server} = await startTcpServer({
    onConnection: async socket => {
      connectionCnt++;
      handleSocketEvents(socket, {
        maxPrintDataLength: 100,
        color: 'red',
        onData: null,
      });
    },
    async tcpHandler(firstChunk, socket) {
      socket.write(firstChunk);
      socket.pipe(socket).pipe(socket);
    },
    koa: app,
  });

  const client = await startSocketClient({host, port});
  const dataSendOverTcp = 'data sent';
  const replyFromServer = await new Promise<string>(res => {
    client.write(dataSendOverTcp);
    client.end(dataSendOverTcp);
    client.on('data', chunk => {
      res(chunk.toString());
    });
  });
  assert.equal([dataSendOverTcp, dataSendOverTcp].join(''), replyFromServer);

  const response1Info = await requestAndGetResponseInfo(
    {
      origin: `http://${host}:${port}`,
    },
    {
      dataType: 'string',
    }
  );
  assert.equal(response1Info.data, httpBlankBody);

  const response2Info = await requestAndGetResponseInfo({
    origin: `http://${host}:${port}/api`,
  });
  assert.equal(response2Info.data, 3);
  server.close();
}
