import assert from 'assert';
import {startKoaServer} from '../server';
import {requestAndGetResponseInfo} from '../../external';
import {EchoConfig} from './middleware-http';
import {getDebugMiddleware, debugMiddlewareWs} from './index';

export async function testEcho() {
  const {origin, server} = await startKoaServer([getDebugMiddleware()], {
    wsMiddlewareList: [debugMiddlewareWs],
  });
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

/**
 * Emitted when the underlying socket times out from inactivity.
 * This only notifies that the socket has been idle. The request must be destroyed manually.
 */
export async function testTimeout() {
  const {origin, server} = await startKoaServer([getDebugMiddleware()]);
  const echoConfig: EchoConfig = {
    delay: 10,
  };
  const payload = {
    timeout: 25,
    target: 'test-timeout',
  };
  try {
    const resInfo = await requestAndGetResponseInfo({
      origin,
      pathname: '/api/debug/echo',
      query: echoConfig,
      method: 'post',
      headers: {
        agent: 'node',
      },
      data: payload,
      timeout: 6000,
    });
    console.log(resInfo);
  } catch (err) {
    console.log(err);
  } finally {
    server.close();
  }
}
