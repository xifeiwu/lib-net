import assert from 'assert';
import logs from './logs';
import {startKoaServer} from '../server';
import {requestAndGetResponseInfo} from '../../external';

export async function testUploadLog() {
  const {origin, server} = await startKoaServer([logs()], {printOrigin: true});
  const data = {a: 1, b: 2};
  const {data: item1} = await requestAndGetResponseInfo({
    origin,
    pathname: '/api/log/node-server',
    method: 'post',
    data,
  });
  assert.deepEqual(data, item1.data);
  assert.equal('node-server', item1.tag);

  const {data: item2} = await requestAndGetResponseInfo({
    origin,
    pathname: '/api/log',
    method: 'post',
    data,
  });
  assert.deepEqual(data, item2.data);
  assert.equal('', item2.tag);

  const {data: list1} = await requestAndGetResponseInfo({
    origin,
    pathname: '/api/log/list',
  });
  assert.ok(Array.isArray(list1) && list1.length === 2);
  console.log(item1, list1);

  const {data: list2} = await requestAndGetResponseInfo({
    origin,
    pathname: '/api/log/list',
    query: {
      tag: 'node-server',
    },
  });
  assert.ok(Array.isArray(list2) && list2.length === 1);
  server.close();
}
