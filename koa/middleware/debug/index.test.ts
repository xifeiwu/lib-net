import fs from 'fs';
import path from 'path';
import assert from 'assert';
import {startKoaServer} from '../../server';
import {
  CustomHandleRequestOptions,
  logColorful,
  ParsedFileInfo,
  HttpBodyParserOptions,
  requestAndGetResponseInfo,
  requestAndGetUpgradeInfo,
  watchSocketState,
  getHttpResponseInfo,
  fromBuffer,
} from '../../../service/external';
import {requestRouter} from './mw-request';
import {upgradeMiddelware} from './mw-upgrade';

const requestMiddleware = requestRouter.routes();
export async function testEcho() {
  const {origin, server} = await startKoaServer({requestMiddlewares: [requestMiddleware]});
  const {
    responseInfo: {statusCode, headers, data: resData},
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

export async function testUpgradeEcho() {
  const {origin, server} = await startKoaServer({
    requestMiddlewares: [requestMiddleware],
    upgradeMiddlewares: [upgradeMiddelware],
  });
  const {socket, response, head} = await requestAndGetUpgradeInfo({
    origin,
    pathname: '/api/debug/echo',
    headers: {
      upgrade: 'any',
    },
  });
  logColorful({}, {responseInfo: await getHttpResponseInfo(response), head: fromBuffer(head, 'json')});
  watchSocketState(socket, {colorStyle: {color: 'green'}});
  socket.write('abc');
}

/**
 * Emitted when the underlying socket times out from inactivity.
 * This only notifies that the socket has been idle. The request must be destroyed manually.
 */
export async function testTimeout() {
  const {origin, server} = await startKoaServer({requestMiddlewares: [requestMiddleware]});
  const customOptions: CustomHandleRequestOptions = {
    delayMs: 10 * 1000,
  };
  try {
    const resInfo = await requestAndGetResponseInfo({
      origin,
      pathname: '/api/debug/custom',
      method: 'post',
      headers: {
        agent: 'node',
      },
      data: {
        timeout: 25,
        target: 'test-timeout',
        config: customOptions,
      },
      timeout: 5000,
    });
    console.log(resInfo);
  } catch (err) {
    console.log(err);
  } finally {
    server.close();
  }
}

export async function testUpload() {
  const uploadDir = path.resolve(__dirname, 'uploads');
  const bodyParserOptions: HttpBodyParserOptions = {
    uploadDir,
    wayOfHandleFile: 'save',
  };
  const {origin, server, app} = await startKoaServer({
    bodyParserOptions,
    requestMiddlewares: [requestMiddleware],
  });

  try {
    const fileName = 'koa-debug-middleware.test.ts';
    const {
      responseInfo: {statusCode, headers, data: resData},
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
    assert.notEqual(fileInfo.name, undefined);
    assert.equal(fs.existsSync(path.resolve(uploadDir, fileInfo.name as string)), true);
  } catch (err) {
    console.log(err);
  } finally {
    server.close();
  }
}
