import path from 'path';
import assert from 'assert';
import {
  connectToSocksServer,
  deepClone,
  logColorful,
  requestAndGetResponseInfo,
  serializableSocksClientInfo,
  SocksClientConfig,
} from '../../service/external';
import {startTcpGateway} from '../server';
import {serializeTcpGatewayConfig, ASSIST_SERVER_DEFAULT_CONFIG} from '../service';

/**
 * Test local tcp gateway
 */
export async function startLocalTcpGateWay() {
  const localConfig = deepClone(ASSIST_SERVER_DEFAULT_CONFIG);
  const {koa} = localConfig;
  koa.shortCut = {staticDir: path.resolve(__dirname, '..'), uploadDir: path.resolve(__dirname, 'uploads')};
  const {gateway: [{host, port}] = []} = await startTcpGateway(localConfig);
  logColorful({}, {host, port, tcpGatewayConfig: serializeTcpGatewayConfig(localConfig)});
}

export async function testSocksApi() {
  const {
    tcp: {
      mwConfig: {socks},
    },
  } = ASSIST_SERVER_DEFAULT_CONFIG;
  const {gateway: [{host, port}] = []} = await startTcpGateway(ASSIST_SERVER_DEFAULT_CONFIG);
  const origin = `http://${host}:${port}`;
  const requestTarget = 'http://elif.site/api/debug/echo';
  /** test vc1 */
  // {
  //   const vc1Http: SocksClientConfig<1> = {
  //     socksVersion: 1,
  //     auth: socks[1].auth,
  //     socksServer: origin,
  //     requestTarget,
  //   };
  //   const vc1Tcp: SocksClientConfig<1> = {
  //     socksVersion: 1,
  //     auth: socks[1].auth,
  //     socksServer: {host, port},
  //     requestTarget,
  //   };
  //   const vc1Info1 = await connectToSocksServer(vc1Http);
  //   const vc1Info2 = await connectToSocksServer(vc1Tcp);
  //   logColorful({}, serializableSocksClientInfo(vc1Info1));
  //   logColorful({}, serializableSocksClientInfo(vc1Info2));
  // }
  /** test v5 */
  {
    const v5Http: SocksClientConfig<5> = {
      socksVersion: 5,
      methodList: socks[5].methodList,
      socksServer: origin,
      requestTarget,
    };
    const v5Tcp: SocksClientConfig<5> = {
      socksVersion: 5,
      methodList: socks[5].methodList,
      socksServer: {host, port},
      requestTarget,
    };
    const v5Info1 = await connectToSocksServer(v5Http);
    const v5Info2 = await connectToSocksServer(v5Tcp);
    logColorful({}, serializableSocksClientInfo(v5Info1));
    logColorful({}, serializableSocksClientInfo(v5Info2));
  }
  const {
    responseInfo: {data: resData},
  } = await requestAndGetResponseInfo({href: origin + '/api/socks/list'});
  assert.equal(resData.length, 2);
}
