import assert from 'assert';
import {toStaticMiddlewareOptions} from './utils';
import {getStaticKoaMw} from './middleware';
import {startKoaServer} from '../../server';
import {requestAndGetResponseInfo} from '../../../service/external';

export async function testGetDefaultStaticOptionsForDirs() {
  const staticOptions = toStaticMiddlewareOptions({dir: __dirname});
  const staticMiddlewares = [getStaticKoaMw(staticOptions)];
  const {origin, server} = await startKoaServer({requestMiddlewares: [...staticMiddlewares]});
  const {responseInfo} = await requestAndGetResponseInfo({
    origin,
    pathname: '/utils.test.ts',
  });
  assert.equal(responseInfo.statusCode, 200);
  console.log(responseInfo);
  server.close();
}

export async function testPerDirStaticOptions() {
  const withGzip = toStaticMiddlewareOptions({dir: __dirname, enableGzip: true});
  const withoutGzip = toStaticMiddlewareOptions({dir: __dirname}, {enableGzip: true});
  assert.equal(withGzip.enableGzip, true);
  assert.equal(withoutGzip.enableGzip, false);
}
