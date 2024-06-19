import Koa from 'koa';
import assert from 'assert';
import {Socket} from 'net';
import {handleSocketEvents} from '../external';
import {startTcpServer} from './on-tcp';
import {requestAndGetResponseInfo, startSocketClient, waitFor} from '../../node';

async function echoData(firstChunk: Buffer, socket: Socket) {
  const onData = chunk => {
    socket.write(chunk);
  };
  onData(firstChunk);
  socket.on('data', onData);
}
async function uppercaseData(firstChunk: Buffer, socket: Socket) {
  const onData = (chunk: Buffer) => {
    socket.pause();
    socket.write(chunk.toString().toUpperCase());
    socket.resume();
  };
  onData(firstChunk);
  socket.on('data', onData);
}

const dataSendOverTcp = ['write data1', 'end data2'];
const invalidHttp = [['get /api http/1.1', 'line1', 'line2'].join('\r\n')];
// const invalidHttp = [['set abc 0 500000 2', 'dd'].join('\r\n')];
const handlerCaseList = {
  echoData: {
    handler: echoData,
    dataSend: dataSendOverTcp,
    dataReply: dataSendOverTcp.join(''),
  },
  echoInvalidHttp: {
    handler: echoData,
    dataSend: invalidHttp,
    dataReply: invalidHttp.join(''),
  },
  uppercaseData: {
    handler: uppercaseData,
    dataSend: dataSendOverTcp,
    dataReply: dataSendOverTcp.join('').toUpperCase(),
  },
};
const caseName = 'echoInvalidHttp';

export async function generalTest() {
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
  const {handler, dataSend, dataReply} = handlerCaseList[caseName];

  const {host, port, server} = await startTcpServer({
    onConnection: async socket => {
      connectionCnt++;
      handleSocketEvents(socket, {
        maxPrintDataLength: 100,
        color: 'red',
        onData: null,
      });
    },
    tcpHandler: handler,
    koa: app,
  });

  const client = await startSocketClient({host, port});
  const replyFromServer = await new Promise<string>(async res => {
    let cnt = 0;
    while (cnt < dataSend.length) {
      if (cnt === dataSend.length - 1) {
        client.end(dataSend[cnt]);
      } else {
        client.write(dataSend[cnt]);
      }
      cnt++;
      await waitFor(1000);
    }
    const bufList: Buffer[] = [];
    client.on('data', chunk => {
      bufList.push(chunk);
    });
    client.on('end', () => {
      res(Buffer.concat(bufList).toString());
    });
  });
  assert.equal(dataReply, replyFromServer);

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

import {Store, getConnectionHandler, getClient} from '../../node/lib/memcached';
export async function testMemcached() {
  const store = new Store();
  const memcachedHandler = getConnectionHandler(store);

  const app = new Koa();
  app.use(async (ctx, next) => {
    const {url} = ctx;
    if (url.startsWith('/api')) {
      ctx.status = 200;
      ctx.body = store.toJSON();
    } else {
      await next();
    }
  });
  const {host, port, server} = await startTcpServer({
    onConnection: async socket => {
      handleSocketEvents(socket, {
        maxPrintDataLength: 100,
        color: 'red',
        onData: null,
      });
    },
    async tcpHandler(firstChunk, socket) {
      memcachedHandler(socket, firstChunk);
    },
    koa: app,
  });
  const client = getClient({host: '127.0.0.1', port});
  const setRes = await client.set({
    expireTimeInSeconds: 500000,
    flags: 'd',
    key: 'abc',
    value: 'dd',
  });
  console.log(setRes);
}
