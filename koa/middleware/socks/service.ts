import {Socket} from 'net';
import {
  handleSocksConnection,
  isSocksProtocol,
  Protocol,
  simplifySocksServerInfo,
  SocksServerConfig,
  SocksServerConfigPerVersion,
} from '../../../external';

export const urlPrefix = '/api/socks';
export const infoList: any[] = [];
export const MAX_INFO_LENGTH = 200;

export async function handleSocksProtocol(
  protocol: Protocol | string | number,
  socket: Socket,
  socksServerConfigMap: Partial<SocksServerConfigPerVersion>,
  way: 'http-upgrade' | 'tcp'
): Promise<boolean> {
  if (!isSocksProtocol(protocol)) {
    return false;
  }
  socksServerConfigMap = socksServerConfigMap ?? {};
  const socksServerConfig: SocksServerConfig = socksServerConfigMap[protocol];
  if (!socksServerConfig) {
    return false;
  }
  const info = await handleSocksConnection(socket, socksServerConfig);
  if (infoList.length > MAX_INFO_LENGTH) {
    infoList.pop();
  }
  infoList.unshift({way, ...simplifySocksServerInfo(info)});
  return true;
}

export const SOCKS_SERVER_CONFIG: Partial<SocksServerConfigPerVersion> = {
  '1': {
    socksVersion: 1,
    auth: {
      username: 'abc',
      password: 'dddd',
    },
  },
  '5': {
    socksVersion: 5,
    methodList: [
      {
        method: 0,
      },
    ],
  },
};
