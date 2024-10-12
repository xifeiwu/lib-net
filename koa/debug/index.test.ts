import fs from 'fs';
import path from 'path';
import assert from 'assert';
import {startKoaServer} from '../server';
import {ParsedFileInfo, ParserOptions, requestAndGetResponseInfo} from '../../external';
import {EchoConfig} from './mw-request';
import {requestMiddleware, upgradeMiddelware} from './index';

export async function testEcho() {
  const {origin, server} = await startKoaServer({middlewareList: [requestMiddleware]});
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
  const uploadDir = path.resolve(__dirname, 'uploads');
  const bodyParserOptions: ParserOptions = {
    uploadDir,
    wayOfHandleFile: 'save',
  };
  const {origin, server, app} = await startKoaServer({
    bodyParserOptions,
    middlewareList: [requestMiddleware],
  });

  try {
    const fileName = 'test-case-4-debug-middleware.ts';
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
        'content-type': 'application/octet-stream',
        'x-file-name': fileName,
      },
      data: fs.createReadStream(__filename),
    });
    console.log(resData);
    const fileInfo: ParsedFileInfo = resData[fileName];
    assert.equal(statusCode, 200);
    assert.equal(fs.existsSync(path.resolve(uploadDir, fileInfo.name)), true);
  } catch (err) {
    console.log(err);
  } finally {
    server.close();
  }
}

/**
 * Emitted when the underlying socket times out from inactivity.
 * This only notifies that the socket has been idle. The request must be destroyed manually.
 */
export async function testTimeout() {
  const {origin, server} = await startKoaServer({middlewareList: [requestMiddleware]});
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
