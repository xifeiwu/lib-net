import fs from 'fs';
import path from 'path';
import assert from 'assert';
import {requestAndGetResponseInfo} from '../../../service/external';
import {startKoaServer} from '../../server';
import {requestRouter} from './mw-request';
export async function testUpload() {
  const {origin, server, app} = await startKoaServer({
    requestMiddlewares: [requestRouter.routes()],
    bodyParserOptions: {
      uploadDir: path.resolve(__dirname, 'uploads'),
      wayOfHandleFile: 'cacheAndSave',
    },
  });

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
      'content-type': 'octet-stream',
      'x-file-name': 'test-case-4-debug-middleware.ts',
    },
    data: fs.createReadStream(__filename),
  });
  assert.equal(statusCode, 200);
  // console.log(resData);
  server.close();
}
