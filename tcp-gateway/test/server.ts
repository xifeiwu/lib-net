import path from 'path';
import {DEFAULT_KOA_CONFIG, KoaShortCutConfig} from '../../koa';
import {AssistServiceConfig} from '../types';
import {SOCKS_SERVER_CONFIG} from '../../koa/middleware/socks/service';
import {logColorful} from '../../service/external';
import {startTcpGateway} from '../server';

const koaConfig = DEFAULT_KOA_CONFIG;
const koaShortCutConfig: KoaShortCutConfig = {
  staticDir: path.resolve(__dirname, '..'),
};

export const customConfig: AssistServiceConfig = {
  tcp: {
    mwConfig: {
      socks: SOCKS_SERVER_CONFIG,
    },
  },
  koa: {
    config: koaConfig,
    shortCut: koaShortCutConfig,
  },
};
export async function startCustomTcpGateWay() {
  const info = await startTcpGateway(customConfig);
  const {gateway: [{host, port}] = []} = info;
  logColorful({}, `start tcp gateway`, {host, port});
  return info;
}
