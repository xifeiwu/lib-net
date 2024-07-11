import fs from 'fs';
import path from 'path';
import assert from 'assert';
import {startKoaServer} from '../server';
import {ParserOptions, requestAndGetResponseInfo} from '../../external';
import {EchoConfig} from './middleware-http';
import {debugMiddleware, debugMiddlewareWs} from './index';

export async function testEcho() {
  const {origin, server} = await startKoaServer([debugMiddleware], {
    wsMiddlewareList: [debugMiddlewareWs],
  });
  const {
    statusCode,
    headers,
    data: resData,
  } = await requestAndGetResponseInfo({
    origin,
    pathname: '/api/debug/echo',
    query: {
      a: 'b',
    },

    method: 'post',
    headers: {
      agent: 'node',
    },
    data: Buffer.from('abc'),
  });
  assert.equal(statusCode, 200);
  try {
    const {method, url, headers, data} = resData;
    assert.equal(method, 'POST');
    assert.equal(url, '/api/debug/echo?a=b');
    assert.equal(headers.agent, 'node');
    assert.equal(data, 'abc');
  } catch (err) {
    console.error(err);
  }
  server.close();
}

export async function testUpload() {
  const {origin, server, app} = await startKoaServer([debugMiddleware], {
    wsMiddlewareList: [debugMiddlewareWs],
  });
  const parseOptions: ParserOptions = {
    uploadDir: path.resolve(__dirname, 'uploads'),
    wayOfHandleFile: 'save',
  };
  app.context.parseOptions = parseOptions;

  try {
    const {
      statusCode,
      headers,
      data: resData,
    } = await requestAndGetResponseInfo({
      origin,
      pathname: '/api/debug/upload',
      query: {
        a: 'b',
      },
      method: 'post',
      headers: {
        'content-type': '.ts',
        'x-file-name': 'test-case-4-debug-middleware',
      },
      data: fs.createReadStream(__filename),
    });
  } catch (err) {
    console.log(err);
  }
  // assert.equal(statusCode, 200);
  // try {
  //   const {method, url, headers, data} = resData;
  //   assert.equal(method, 'POST');
  //   assert.equal(url, '/api/debug/echo?a=b');
  //   assert.equal(headers.agent, 'node');
  //   assert.equal(data, 'abc');
  // } catch (err) {
  //   console.error(err);
  // }
  // server.close();
}

/**
 * Emitted when the underlying socket times out from inactivity.
 * This only notifies that the socket has been idle. The request must be destroyed manually.
 */
export async function testTimeout() {
  const {origin, server} = await startKoaServer([debugMiddleware]);
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
