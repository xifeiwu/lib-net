import {deepEqual, requestAndGetResponseInfo, toUrl, uuid} from '../../node';
import {startDefaultServer} from '../server';
import {users, posts} from './mock-data';
import middlewareForum, {prefix, handleUpgrade} from './index';
import assert from 'assert';
import {Post, Reaction} from './types/frontend';
import {ErrorBody, INVALIDATE_PAYLOAD} from '../error-catch';

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
        url: url,
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
        url: url,
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
  console.log(url);
  await new Promise(res => setTimeout(res, 24 * 3600 * 1000));
  server.close();
}
