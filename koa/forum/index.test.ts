import {deepEqual, requestAndGetResponseInfo, toUrl} from '../../node';
import {startDefaultServer} from '../server';
import {users, posts} from './mock-data';
import middlewareForum, {prefix} from './index';
import assert from 'assert';

export async function getPosts() {
  // const [, secondUser] = users;
  const url = `${prefix}/posts`;
  const {href, server} = await startDefaultServer([
    async (ctx, next) => {
      const {url} = ctx;
      // console.log(url);
      // ctx.body = url;
      await next();
    },
    middlewareForum,
  ]);
  const {statusCode, headers, data} = await requestAndGetResponseInfo(href, {method: 'get', path: url});
  const parsedData = JSON.parse(data as string);
  // console.log({statusCode, headers, data});
  assert.equal(statusCode, 200);
  assert(deepEqual(parsedData, posts, {debug: true}));
  // await new Promise(res => setTimeout(res, 1000 * 60));
  // server.close();
}

export async function getPostById() {
  const [, secondPost] = posts;
  const pathname = `${prefix}/posts/:postId`;
  const {href, server} = await startDefaultServer([middlewareForum]);
  {
    const {statusCode, headers, data} = await requestAndGetResponseInfo(href, {
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
    const {statusCode, headers, data} = await requestAndGetResponseInfo(href, {
      method: 'get',
      path: toUrl({
        path: pathname,
        params: {
          postId: `secondPost.id`,
        },
      }),
    });
    assert(statusCode === 400 && data === 'post with postId secondPost.id not exist');
  }
  server.close();
}
