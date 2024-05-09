import {
  deepEqual,
  requestAndGetResponseInfo,
  requestAndGetUpgradeInfo,
  requestAndGetRelatedInfo,
  httpRequestOptionsToCurlCommand,
  urlPropsToHref,
  uuid,
  PORT,
} from '../../external';
import {startKoaServer} from '../server';
import {users, posts} from './mock-data';
import middlewareForum, {handleUpgrade} from './index';
import assert from 'assert';
import {Post, Reaction} from './types/frontend';
import {ErrorBody, INVALIDATE_PAYLOAD} from '../middleware/error-catch';
import {prefix} from './service';
import {wsPath} from './websocket';
import {WebSocket} from 'ws';

export async function getPosts() {
  // const [, secondUser] = users;
  const url = `${prefix}/posts`;
  const {origin, server} = await startKoaServer([
    async (ctx, next) => {
      const {url} = ctx;
      // console.log(url);
      // ctx.body = url;
      await next();
    },
    middlewareForum,
  ]);
  const {statusCode, headers, data} = await requestAndGetResponseInfo({
    url: origin,
    method: 'get',
    path: url,
  });
  const parsedData = JSON.parse(data as string);
  // console.log({statusCode, headers, data});
  assert.equal(statusCode, 200);
  assert(deepEqual(parsedData, posts, {debug: true}));
  server.close();
}

export async function getPostById() {
  const [, secondPost] = posts;
  const pathname = `${prefix}/posts/:postId`;
  const {origin, server} = await startKoaServer([middlewareForum]);
  {
    const {statusCode, headers, data} = await requestAndGetResponseInfo({
      url: origin,
      method: 'get',
      path: urlPropsToHref({
        pathname,
        pathnameParams: {
          postId: secondPost.id,
        },
      }),
    });
    // console.log({statusCode, headers, data});
    assert(deepEqual(JSON.parse(data as string), secondPost));
  }
  {
    const {statusCode, headers, data} = await requestAndGetResponseInfo<ErrorBody>({
      url: origin,
      method: 'get',
      path: urlPropsToHref({
        pathname,
        pathnameParams: {
          postId: `secondPost.id`,
        },
      }),
    });
    assert(statusCode === 400 && data.message === 'post with postId secondPost.id not exist');
  }
  server.close();
}

export async function postPost() {
  const pathname = `${prefix}/posts`;
  const {origin, server} = await startKoaServer([middlewareForum]);
  /** data is not passed */
  {
    const {statusCode, headers, data} = await requestAndGetResponseInfo(
      {
        origin,
        method: 'post',
        pathname,
      },
      {
        dataType: 'json',
      }
    );
    assert.equal(data.message, 'data is empty');
  }
  /** send post instance to server, and return the final instance on server side. */
  {
    const post: Post = {
      title: `title` + uuid(21),
      content: `content` + uuid(21),
      reactions: {
        thumbsUp: 0,
        hooray: 0,
        heart: 0,
        rocket: 0,
        eyes: 0,
      },
      user: users[0].id,
    };
    const {statusCode, headers, data} = await requestAndGetResponseInfo(
      {
        url: origin,
        method: 'post',
        path: urlPropsToHref({
          pathname,
        }),
        data: post,
      },
      {
        dataType: 'json',
      }
    );
    assert(deepEqual(post, data, {}, {refer: 'first'}));
    // console.log({statusCode, headers, data});
    // assert(deepEqual(JSON.parse(data as string), secondPost));
  }
  server.close();
}

export async function testValidate() {
  const pathname = `${prefix}/posts`;
  const {origin, server} = await startKoaServer([middlewareForum]);
  /** validate post payload */
  {
    const post: Post = {
      title: `title` + uuid(21),
      // @ts-ignore
      content: 0,
      reactions: {
        thumbsUp: 0,
        hooray: 0,
        heart: 0,
        rocket: 0,
        eyes: 0,
      },
      user: users[0].id,
    };
    const {statusCode, headers, data} = await requestAndGetResponseInfo<ErrorBody, Post>(
      {
        origin,
        method: 'post',
        pathname,
        data: post,
      },
      {
        dataType: 'json',
      }
    );
    assert.equal(statusCode, 400);
    assert.equal(data.message, INVALIDATE_PAYLOAD);
  }
  server.close();
}

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
  console.log(responseInfo);
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
    }
  );
  server.on('upgrade', handleUpgrade);
  const {socket, head} = await requestAndGetUpgradeInfo({
    url: origin,
    path: wsPath,
    headers: {
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept-Language': 'zh-CN,zh;q=0.9',
      Connection: 'Upgrade',
      // Host: localhost:8102
      // Origin: http://localhost:8102
      'Sec-Websocket-Extensions': 'permessage-deflate; client_max_window_bits',
      'Sec-Websocket-Key': '+HxsOx05N7ArmiVGdL/KFA==',
      'Sec-Websocket-Version': 13,
      Upgrade: 'websocket',
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36',
    },
  });

  // socket.on('data', chunk => {
  //   console.log(chunk.toString());
  // });
  const ws = new WebSocket(null);
  // @ts-ignore
  ws._isServer = false;
  // @ts-ignore
  ws.setSocket(socket, head, {
    maxPayload: 100 * 1024 * 1024,
    skipUTF8Validation: false,
  });

  ws.on('message', (data, isBinary) => {
    console.log(`data`);
    console.log(data.toString());
  });
  await sendBroadcast(origin);

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
