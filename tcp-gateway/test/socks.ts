import assert from 'assert';
import {
  connectToSocksServer,
  logColorful,
  requestAndGetResponseInfo,
  serializableSocksClientInfo,
  SocksClientConfig,
} from '../../service/external';
import {startCustomTcpGateWay, customConfig} from './server';

export async function testSocksApi() {
  const {host, port} = await startCustomTcpGateWay();
  const origin = `http://${host}:${port}`;
  const {
    mwConfig: {socks},
  } = customConfig;
  const requestTarget = 'http://elif.site/api/debug/echo';
  const v1Http: SocksClientConfig<1> = {
    socksVersion: 1,
    auth: socks[1].auth,
    socksServer: origin,
    requestTarget,
  };
  const v1Tcp: SocksClientConfig<1> = {
    socksVersion: 1,
    auth: socks[1].auth,
    socksServer: {host, port},
    requestTarget,
  };
  const info1 = await connectToSocksServer(v1Http);
  const info2 = await connectToSocksServer(v1Tcp);
  logColorful({}, serializableSocksClientInfo(info1));
  logColorful({}, serializableSocksClientInfo(info2));
  const {
    responseInfo: {data: resData},
  } = await requestAndGetResponseInfo({href: origin + '/api/socks/list'});
  assert.equal(resData.length, 2);
}
