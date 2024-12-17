import assert from 'assert';
import {
  deepEqual,
  logColorful,
  requestAndGetResponseInfo,
  urlPropsToHref,
  uuid,
} from '../../../../service/external';
import {requestRouter} from '../mw-request';
import {startKoaServer} from '../../../server';
import {mocked, urlPrefix} from '../service';
import { Post } from '../service/types/frontend';

export async function testRequestRouter() {
  const pathnameList = requestRouter.stack.map(it => {
    const {methods, path} = it;
    return {methods, path};
  });
  logColorful({}, pathnameList);
}

export async function testGetPosts() {
  // const [, secondUser] = users;
  const url = `${urlPrefix}/posts`;
  const {origin, server} = await startKoaServer({
    requestMiddlewares: [requestRouter.routes()],
  });
  const {statusCode, headers, data} = await requestAndGetResponseInfo({
    url: origin,
    method: 'get',
    path: url,
  });
  // const parsedData = JSON.parse(data as string);
  assert.equal(statusCode, 200);
  assert(deepEqual(data, mocked.posts, {debug: true}));
  server.close();
}

export async function getPostById() {
  const [, secondPost] = mocked.posts;
  const pathname = `${urlPrefix}/posts/:postId`;
  const {origin, server} = await startKoaServer({
    requestMiddlewares: [requestRouter.routes()],
  });
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
    assert(deepEqual(data, secondPost));
  }
  {
    const {statusCode, headers, data} = await requestAndGetResponseInfo({
      url: origin,
      method: 'get',
      path: urlPropsToHref({
        pathname,
        pathnameParams: {
          postId: `secondPost.id`,
        },
      }),
    });
    assert(statusCode === 400);
  }
  server.close();
}

export async function postPost() {
  const pathname = `${urlPrefix}/posts`;
  const {origin, server} = await startKoaServer({
    requestMiddlewares: [requestRouter.routes()],
  });
  /** data is not passed */
  {
    const {data} = await requestAndGetResponseInfo({
      origin,
      method: 'post',
      pathname,
    });
    assert.equal(data, 'data is empty');
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
      user: mocked.users[0].id,
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
  const pathname = `${urlPrefix}/posts`;
  const {origin, server} = await startKoaServer({
    requestMiddlewares: [requestRouter.routes()],
  });
  /** validate post payload */
  {
    const post: Post = {
      title: `title` + uuid(21),
      // @ts-ignore content should be string
      content: 0,
      reactions: {
        thumbsUp: 0,
        hooray: 0,
        heart: 0,
        rocket: 0,
        eyes: 0,
      },
      user: mocked.users[0].id,
    };
    const {statusCode, headers, data} = await requestAndGetResponseInfo(
      {
        origin,
        method: 'post',
        pathname,
        data: post,
      }
    );
    assert.equal(statusCode, 400);
    // assert.equal(data.message, INVALIDATE_PAYLOAD);
  }
  server.close();
}