import {AssetsSyncUpConfig, TcpHandlerMiddleware} from '../../../tcp/types';
import {ASSETS_SYNC_PROTOCOL_BYTE, handleAssetsSyncConnection} from '../../../service/external';

export function getAssetsTcpMw(config: AssetsSyncUpConfig) {
  const tcpHandlerMiddleware: TcpHandlerMiddleware = async (ctx, next) => {
    if (ctx.protocol !== ASSETS_SYNC_PROTOCOL_BYTE) {
      return await next();
    }
    await handleAssetsSyncConnection(ctx.socket, config);
  };
  return tcpHandlerMiddleware;
}
