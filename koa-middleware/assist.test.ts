import assert from 'assert';
import {requestAndGetResponseInfo} from '../../node';
import {startKoaServer} from '../server/koa';

export async function testUploadData() {
  const {origin, server} = await startKoaServer(['assist'], {printUrl: true});
  const {data: item} = await requestAndGetResponseInfo({
    url: origin,
    path: '/api/assist/data/upload',
    method: 'post',
    data: {a: 1, b: 2},
  });
  const {data: list} = await requestAndGetResponseInfo({
    url: origin,
    path: '/api/assist/data/list',
  });
  assert.ok(Array.isArray(list));
  console.log(item, list);
  // server.close();
}
