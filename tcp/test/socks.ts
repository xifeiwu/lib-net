import assert from 'assert';
import {
  connectToSocksServer,
  logColorful,
  requestAndGetResponseInfo,
  serializableSocksClientInfo,
  SocksClientConfig,
} from '../../external';
import {startFullFeatureTcpGateWay, tcpGateWayConfig} from './server.test';

export async function testSocksApi() {
  const {host, port} = await startFullFeatureTcpGateWay();
  const origin = `http://${host}:${port}`;
  const {
    mwConfig: {socksConfig},
  } = tcpGateWayConfig;
  const requestTarget = 'http://elif.site/api/debug/echo';
  const v1Http: SocksClientConfig<1> = {
    socksVersion: 1,
    auth: socksConfig[1].auth,
    socksServer: origin,
    requestTarget,
  };
  const v1Tcp: SocksClientConfig<1> = {
    socksVersion: 1,
    auth: socksConfig[1].auth,
    socksServer: {host, port},
    requestTarget,
  };
  const info1 = await connectToSocksServer(v1Http);
  const info2 = await connectToSocksServer(v1Tcp);
  logColorful({}, serializableSocksClientInfo(info1));
  logColorful({}, serializableSocksClientInfo(info2));
  const {data: resData} = await requestAndGetResponseInfo({href: origin + '/api/socks/list'})
  assert.equal(resData.length, 2);
}
