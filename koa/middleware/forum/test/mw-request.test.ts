import assert from 'assert';
import {deepEqual, logColorful, requestAndGetResponseInfo} from '../../../../service/external';
import {requestRouter} from '../mw-request';
import {startKoaServer} from '../../../server';
import {mocked, urlPrefix} from '../service';

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
