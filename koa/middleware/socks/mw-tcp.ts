import {SocksServerConfigPerVersion} from '../../../service/external';
import {TcpHandlerMiddleware} from '../../../tcp-gateway/types';
import {handleSocksProtocol} from './service';

export function getSocksTcpMw(socksServerConfigMap: Partial<SocksServerConfigPerVersion>) {
  const tcpHandlerMiddleware: TcpHandlerMiddleware = async (ctx, next) => {
    const {protocol, socket} = ctx;
    const isHandled = await handleSocksProtocol(protocol, socket, socksServerConfigMap, 'tcp');
    if (!isHandled) {
      return await next();
    }
  };
  return tcpHandlerMiddleware;
}
