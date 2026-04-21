import {
  getOneLineFromReader,
  getUpgradeResponse,
  httpResponseInfoToBuffer,
  SocksServerConfigPerVersion,
  UPGRADE_PROTOCOL_SOCKS_PREFIX,
} from '../../../service/external';
import {UpgradeMiddleware} from '../../types';
import {handleSocksProtocol} from './service';

export function socksHttpUpgradeMw(socksServerConfigMap: Partial<SocksServerConfigPerVersion>) {
  const upgradeMiddelware: UpgradeMiddleware = async (ctx, next) => {
    const {protocol, socket} = ctx;
    if (!protocol.startsWith(UPGRADE_PROTOCOL_SOCKS_PREFIX)) {
      return await next();
    }
    socket.write(httpResponseInfoToBuffer(getUpgradeResponse(protocol)));
    /** Get version from protocol string first */
    let version: string | number = protocol.replace(UPGRADE_PROTOCOL_SOCKS_PREFIX, '');
    if (!version) {
      const chunk = await getOneLineFromReader(socket, {firstChunkOnly: true});
      socket.unshift(chunk);
      version = chunk[0];
    }
    const isHandled = await handleSocksProtocol(version, socket, socksServerConfigMap, 'http-upgrade');
    if (!isHandled) {
      return await next();
    }
  };
  return upgradeMiddelware;
}
