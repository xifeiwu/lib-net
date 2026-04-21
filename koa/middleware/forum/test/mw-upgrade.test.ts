import assert from 'assert';
import {
  httpRequestOptionsToCurlCommand,
  logColorful,
  requestAndGetRelatedInfo,
  requestAndGetUpgradeInfo,
  waitFor,
} from '../../../../service/external';
import {forumKoaRouter as requestRouter} from '../mw-koa';
import {startKoaServer} from '../../../server';
import {mocked, urlPrefix, WS_PATH} from '../service';
import {forumHttpUpgradeMw as upgradeMiddleware} from '../mw-http-upgrade';
import {WebSocket} from 'ws';

async function sendBroadcast(origin: string) {
  const pathname = `${urlPrefix}/notifications/broadcast`;
  // origin = origin ?? `http://127.0.0.1:${PORT.fullFeatureHttpServer.port}`;
  // const {origin, server} = await startKoaServer({
  //   requestMiddlewares: [requestRouter.routes()],
  // });
  const {requestOptions, responseInfo} = await requestAndGetRelatedInfo({
    origin,
    pathname,
  });
  assert.ok(Array.isArray(responseInfo.data));
  console.log(httpRequestOptionsToCurlCommand(requestOptions));
}

export async function testWsNotification() {
  const {origin, server} = await startKoaServer({
    requestMiddlewares: [requestRouter.routes()],
    upgradeMiddlewares: [upgradeMiddleware],
  });
  const {socket, head} = await requestAndGetUpgradeInfo({
    origin,
    pathname: WS_PATH.notifications,
    headers: {
      // Connection: 'Upgrade',
      Upgrade: 'websocket',
      // Host: localhost:8102
      // Origin: http://localhost:8102
      // 'Sec-Websocket-Extensions': 'permessage-deflate; client_max_window_bits',
      'Sec-Websocket-Key': '+HxsOx05N7ArmiVGdL/KFA==',
      'Sec-Websocket-Version': 13,
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36',
    },
  });
  // socket.on('data', chunk => {
  //   console.log(chunk.toString());
  // });
  /** A WebSocket based on current socket */
  const ws = new WebSocket(null, null, {});
  // @ts-ignore
  ws._isServer = false;
  // @ts-ignore
  ws.setSocket(socket, head, {
    maxPayload: 100 * 1024 * 1024,
    skipUTF8Validation: false,
  });
  ws.on('message', (data, isBinary) => {
    logColorful({color: 'red'}, data.toString());
  });

  const clientSocket = new WebSocket(`${origin}${WS_PATH.notifications}`, [], {});
  clientSocket.on('message', (data, isBinary) => {
    logColorful({color: 'blue'}, data.toString());
  });
  await new Promise((res, rej) => {
    clientSocket.on('open', res);
    clientSocket.on('error', rej);
  });
  // clientSocket.send(Buffer.from('data from client websocket'));

  await waitFor(1000);
  await sendBroadcast(origin);
  // server.close();
}
