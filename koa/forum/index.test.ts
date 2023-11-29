import {deepEqual, requestAndGetResponseInfo, requestAndGetUpgradeInfo, toUrl, uuid} from '../../node';
import {startDefaultServer} from '../server';
import {users, posts} from './mock-data';
import middlewareForum, {handleUpgrade} from './index';
import assert from 'assert';
import {Post, Reaction} from './types/frontend';
import {ErrorBody, INVALIDATE_PAYLOAD} from '../error-catch';
import {prefix} from './service';
import http from 'http';
import {wsPath} from './websocket';
import {Socket} from 'dgram';
import {WebSocket} from 'ws';

export async function getPosts() {
  // const [, secondUser] = users;
  const url = `${prefix}/posts`;
  const {url: href, server} = await startDefaultServer([
    async (ctx, next) => {
      const {url} = ctx;
      // console.log(url);
      // ctx.body = url;
      await next();
    },
    middlewareForum,
  ]);
  const {statusCode, headers, data} = await requestAndGetResponseInfo({url: href, method: 'get', path: url});
  const parsedData = JSON.parse(data as string);
  // console.log({statusCode, headers, data});
  assert.equal(statusCode, 200);
  assert(deepEqual(parsedData, posts, {debug: true}));
  server.close();
}

export async function getPostById() {
  const [, secondPost] = posts;
  const pathname = `${prefix}/posts/:postId`;
  const {url: href, server} = await startDefaultServer([middlewareForum]);
  {
    const {statusCode, headers, data} = await requestAndGetResponseInfo({
      url: href,
      method: 'get',
      path: toUrl({
        path: pathname,
        params: {
          postId: secondPost.id,
        },
      }),
    });
    // console.log({statusCode, headers, data});
    assert(deepEqual(JSON.parse(data as string), secondPost));
  }
  {
    const {statusCode, headers, data} = await requestAndGetResponseInfo<ErrorBody>({
      url: href,
      method: 'get',
      path: toUrl({
        path: pathname,
        params: {
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
  const {url: href, server} = await startDefaultServer([middlewareForum]);
  /** data is not passed */
  {
    const {statusCode, headers, data} = await requestAndGetResponseInfo(
      {
        url: href,
        method: 'post',
        path: toUrl({
          path: pathname,
        }),
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
        url: href,
        method: 'post',
        path: toUrl({
          path: pathname,
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
  const {url: href, server} = await startDefaultServer([middlewareForum]);
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
        url: href,
        method: 'post',
        path: toUrl({
          path: pathname,
        }),
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
  const {url, server} = await startDefaultServer([middlewareForum]);
  const [firstPost] = posts;
  firstPost.title = `modified: ${firstPost.title}`;
  /** data is not passed */
  {
    const {statusCode, headers, data} = await requestAndGetResponseInfo<Post, Partial<Post>>(
      {
        url,
        method: 'patch',
        path: toUrl({
          path: pathname,
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
  const {url, server} = await startDefaultServer([middlewareForum]);
  const [firstPost] = posts;
  {
    const {id: postId} = firstPost;
    const {statusCode, headers, data} = await requestAndGetResponseInfo<Reaction, Partial<Reaction>>(
      {
        url,
        method: 'post',
        path: toUrl({
          path: pathname,
          params: {
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

export async function testWsNotification() {
  const {url, server} = await startDefaultServer(
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
    url,
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

  const res = await requestAndGetResponseInfo({
    url,
    path: `${prefix}/ws/notifications/broadcast`,
  });
  console.log(res);
}

/** start koa http server with forum middleware */
export async function startForumServer() {
  const {url, server} = await startDefaultServer(
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
  console.log(`start server: ${url}`);
  await new Promise(res => setTimeout(res, 24 * 3600 * 1000));
  server.close();
}
