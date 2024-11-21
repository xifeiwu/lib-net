import path from 'path';
import {KOA_CONFIG, KoaShortCutConfig} from '../../koa';
import {TcpGateWayConfig} from '../types';
import {SOCKS_SERVER_CONFIG} from '../../koa/middleware/socks/service';
import {deepClone, getAFreePort, logColorful} from '../../service/external';
import {startTcpGateWay} from '../server';
import {serializeTcpGatewayConfig, TCP_GATEWAY_CONFIG} from '../service';

const koaConfig = KOA_CONFIG;
const koaShortCutConfig: KoaShortCutConfig = {
  staticDir: path.resolve(__dirname, '..'),
};

export const customConfig: TcpGateWayConfig = {
  mwConfig: {
    socksConfig: SOCKS_SERVER_CONFIG,
  },
  tcpServerConfig: {
    // port: await getAFreePort(),
  },
  koa: {
    config: koaConfig,
    shortCut: koaShortCutConfig,
  },
};
export async function startCustomTcpGateWay() {
  const info = await startTcpGateWay(customConfig);
  const {host, port} = info;
  logColorful({}, `start tcp gateway`, {host, port});
  return info;
}

