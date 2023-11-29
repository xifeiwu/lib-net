import http from 'http';
import assert from 'assert';
import {startDefaultServer} from './server';
import {getStreamData, requestAndGetResponse} from '../node';
import middlewareForum from './forum';

export async function testDebugEcho() {
  const {url, server} = await startDefaultServer();
  const response = await requestAndGetResponse({
    url,
    path: '/api/debug/echo',
    method: 'post',
    headers: {
      agent: 'node',
    },
    data: Buffer.from('abc'),
  });
  const {statusCode, headers} = response;
  assert.equal(statusCode, 200);
  const resData = await getStreamData(response);
  try {
    const {method, path, headers, data} = JSON.parse(resData.toString());
    assert.equal(method, 'POST');
    assert.equal(path, '/api/debug/echo');
    assert.equal(headers.agent, 'node');
    assert.equal(data, 'abc');
  } catch (err) {
    console.error(err);
  }
  server.close();
}
