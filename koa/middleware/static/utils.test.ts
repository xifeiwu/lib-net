import assert from 'assert';
import {getDefaultStaticOptionsForDirs} from './utils';
import {startKoaServer} from '../../server';
import {staticKoaMw} from './middleware';
import {requestAndGetResponseInfo} from '../../../service/external';

export async function testGetDefaultStaticOptionsForDirs() {
  const staticOptions = getDefaultStaticOptionsForDirs([__dirname]);
  const staticMiddlewares = staticOptions.map(staticKoaMw);
  const {origin, server} = await startKoaServer({requestMiddlewares: [...staticMiddlewares]});
  const {responseInfo} = await requestAndGetResponseInfo({
    origin,
    pathname: '/utils.test.ts',
  });
  assert.equal(responseInfo.statusCode, 200);
  console.log(responseInfo);
  server.close();
}
