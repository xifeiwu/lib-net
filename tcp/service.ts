import {PORT, TcpHandler, TcpServerConfig} from '../external';
import compose from 'koa-compose';
import {Ctx4TcpHandler, TcpHandlerMiddleware} from './types';

export const localTcpServerConfig: TcpServerConfig = {
  port: PORT.fullFeatureTcpServer.port,
  host: '0.0.0.0',
};

const NoHandleMiddleware = (ctx: Ctx4TcpHandler, next) => {
  return false;
};

export function getTcpHandler(middlewareList: TcpHandlerMiddleware[]): TcpHandler {
  const fn = compose([...middlewareList, NoHandleMiddleware]);
  const tcpHandler: TcpHandler = async (socket, {protocol, firstChunk}) => {
    const ctx: Ctx4TcpHandler = {socket, protocol};
    return await fn(ctx);
  };
  return tcpHandler;
}

