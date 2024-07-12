import assert from 'assert';
import {getDefaultStaticOptionsForDirs} from './utils';
import {startKoaServer} from '../server';
import {getStaticMiddleware} from './middleware';
import {requestAndGetResponseInfo} from '../../external';

export async function testGetDefaultStaticOptionsForDirs() {
  const staticOptions = getDefaultStaticOptionsForDirs([__dirname]);
  const staticMiddlewares = staticOptions.map(getStaticMiddleware);
  const {origin} = await startKoaServer({}, [...staticMiddlewares]);
  const responseInfo = await requestAndGetResponseInfo({
    origin,
    pathname: '/utils.test.ts',
  });
  assert.equal(responseInfo.statusCode, 200);
  console.log(responseInfo);
}
