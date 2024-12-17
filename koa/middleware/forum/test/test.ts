import {
  deepEqual,
  requestAndGetResponseInfo,
  requestAndGetUpgradeInfo,
  requestAndGetRelatedInfo,
  httpRequestOptionsToCurlCommand,
  urlPropsToHref,
  uuid,
  PORT,
  logWithColor,
  waitFor,
} from '../../../service/external';
import {startKoaServer} from '../../server';
import {users, posts} from './mock-data';
import middlewareForum, {handleUpgrade} from './mw-request';
import assert from 'assert';
import {Post, Reaction} from './types/frontend';
import {ErrorBody, INVALIDATE_PAYLOAD} from '../middleware/error-catch';
import {prefix} from './service';
import {forumWsMiddleware, wsPath} from './websocket';
import {WebSocket} from 'ws';

export async function patchPost() {
  const pathname = `${prefix}/posts`;
  const {origin, server} = await startKoaServer([middlewareForum]);
  const [firstPost] = posts;
  firstPost.title = `modified: ${firstPost.title}`;
  /** data is not passed */
  {
    const {statusCode, headers, data} = await requestAndGetResponseInfo<Post, Partial<Post>>(
      {
        url: origin,
        method: 'patch',
        path: urlPropsToHref({
          pathname,
        }),
        data: firstPost,
      },
      {
        dataType: 'json',
      }
    );
    assert.deepEqual(firstPost, data);
  }
  server.close();
}

export async function testReaction() {
  const pathname = `${prefix}/posts/:postId/reactions`;
  const {origin, server} = await startKoaServer([middlewareForum]);
  const [firstPost] = posts;
  {
    const {id: postId} = firstPost;
    const {statusCode, headers, data} = await requestAndGetResponseInfo<Reaction, Partial<Reaction>>(
      {
        origin,
        method: 'post',
        pathname: urlPropsToHref({
          pathname,
          pathnameParams: {
            postId,
          },
        }),
        data: {
          thumbsUp: 1,
          heart: 1,
        },
      },
      {
        dataType: 'json',
      }
    );
    assert.equal(data.heart, 1);
    assert.equal(data.thumbsUp, 1);
  }
  server.close();
}

export async function sendBroadcast(origin?: string) {
  origin = origin ?? `http://127.0.0.1:${PORT.fullFeatureHttpServer.port}`;
  const {requestOptions, responseInfo} = await requestAndGetRelatedInfo({
    origin,
    pathname: `${prefix}/ws/notifications/broadcast`,
  });
  assert.ok(Array.isArray(responseInfo.data));
  console.log(httpRequestOptionsToCurlCommand(requestOptions));
}

export async function testWsNotification() {
  const {origin, server} = await startKoaServer(
    [
      async (ctx, next) => {
        const {url} = ctx;
        // console.log(url);
        // ctx.body = url;
        await next();
      },
      middlewareForum,
    ],
    {
      port: 3100,
      wsMiddlewareList: [forumWsMiddleware],
    }
  );
  // server.on('upgrade', handleUpgrade);
  const {socket, head} = await requestAndGetUpgradeInfo({
    origin,
    pathname: wsPath,
    headers: {
      Connection: 'Upgrade',
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
  ws.setSocket(socket, head, {
    maxPayload: 100 * 1024 * 1024,
    skipUTF8Validation: false,
  });
  ws.on('message', (data, isBinary) => {
    logWithColor('red', data.toString());
  });

  const clientSocket = new WebSocket(`${origin}${wsPath}`, [], {});
  clientSocket.on('message', (data, isBinary) => {
    logWithColor('blue', data.toString());
  });
  await new Promise((res, rej) => {
    clientSocket.on('open', res);
    clientSocket.on('error', rej);
  });
  // clientSocket.send(Buffer.from('data from client websocket'));

  await waitFor(1000);
  await sendBroadcast(origin);
  server.close();
  /** for frontend usage */
  // const socket = new WebSocket('ws://127.0.0.1:3100/api/forum/ws/notifications');
  // // Connection opened
  // socket.addEventListener('open', function (event) {
  //   socket.send('Hello Server!');
  // });
  // // Listen for messages
  // socket.addEventListener('message', function (event) {
  //   console.log('Message from server ', event.data);
  // });
}

/** start koa http server with forum middleware */
export async function startForumServer() {
  const {origin, server} = await startKoaServer(
    [
      async (ctx, next) => {
        const {url} = ctx;
        // console.log(url);
        // ctx.body = url;
        await next();
      },
      middlewareForum,
    ],
    {
      port: 3100,
    }
  );
  server.on('upgrade', handleUpgrade);
  console.log(`start server: ${origin}`);
  await new Promise(res => setTimeout(res, 24 * 3600 * 1000));
  server.close();
}
