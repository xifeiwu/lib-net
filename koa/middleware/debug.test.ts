import assert from 'assert';
import {startKoaServer} from '../server/koa';
import {requestAndGetResponseInfo} from '../external';
// import middlewareForum from './forum';

export async function testEcho() {
  const {origin, server} = await startKoaServer(['debug']);
  const {
    statusCode,
    headers,
    data: resData,
  } = await requestAndGetResponseInfo({
    url: origin,
    path: '/api/debug/echo',
    method: 'post',
    headers: {
      agent: 'node',
    },
    data: Buffer.from('abc'),
  });
  assert.equal(statusCode, 200);
  try {
    const {method, path, headers, data} = resData;
    assert.equal(method, 'POST');
    assert.equal(path, '/api/debug/echo');
    assert.equal(headers.agent, 'node');
    assert.equal(data, 'abc');
  } catch (err) {
    console.error(err);
  }
  server.close();
}
