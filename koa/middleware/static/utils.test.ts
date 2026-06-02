import assert from 'assert';
import {getStaticKoaMw} from './middleware';
import {startKoaServer} from '../../server';
import {requestAndGetResponseInfo} from '../../../service/external';

export async function testGetDefaultStaticOptionsForDirs() {
  const staticMiddlewares = [getStaticKoaMw({dir: __dirname})];
  const {origin, server} = await startKoaServer({requestMiddlewares: [...staticMiddlewares]});
  const {responseInfo} = await requestAndGetResponseInfo({
    origin,
    pathname: '/utils.test.ts',
  });
  assert.equal(responseInfo.statusCode, 200);
  console.log(responseInfo);
  server.close();
}
