import path from 'path';
import {KOA_CONFIG, KoaShortCutConfig} from '../../koa';
import {TcpGateWayConfig} from '../types';
import {SOCKS_SERVER_CONFIG} from '../../koa/middleware/socks/service';
import {getAFreePort, logColorful} from '../../external';
import {startTcpGateWay} from '../server';

const koaConfig = KOA_CONFIG;
const koaShortCutConfig: KoaShortCutConfig = {
  staticDir: path.resolve(__dirname, '..'),
};

export const tcpGateWayConfig: TcpGateWayConfig = {
  koaConfig,
  koaShortCutConfig,
  mwConfig: {
    socksConfig: SOCKS_SERVER_CONFIG,
  },
  tcpServerConfig: {
    // port: await getAFreePort(),
  },
};
export async function startFullFeatureTcpGateWay() {
  const info = await startTcpGateWay(tcpGateWayConfig);
  const {host, port} = info;
  logColorful({}, `start tcp gateway`, {host, port});
  return info;
}
