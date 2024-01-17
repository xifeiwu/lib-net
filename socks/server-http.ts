import {Socket} from 'net';
import Koa from 'koa';
import {SocksStatusOnServerSide, getSocketInfo, HttpServerConfig, upgradeProtocol} from './service';
import {startDefaultServer} from '../koa';
import {getAFreePort, getHttpIncomingMessageInfo, isNumber} from '../node';
import {handleConnection} from './service/handle-connection';

/**
 * Start a http server, can use http upgrade socket to run socks protocol.
 * @param config
 * @returns
 */
export async function startHttpServer(config: HttpServerConfig) {
  const {methodList, serverConfig, onConnection, proxyAsSocketClientConfigList} = config;
  const {host = '127.0.0.1', port: _port} = serverConfig ?? {};
  const port = isNumber(_port) ? _port : await getAFreePort();
  /** Use authorized method first */
  methodList.sort((pre, next) => next.method - pre.method);
  const connectStatusList: SocksStatusOnServerSide[] = [];

  const middleware: Koa.Middleware = async (ctx, next) => {
    const {url} = ctx;
    if (url === '/api/socks/connections') {
      ctx.type = 'json';
      ctx.body = connectStatusList.map(it => {
        const {socket, socket2Service} = it;
        return {
          ...it,
          socket: getSocketInfo(socket),
          socket2Service: getSocketInfo(socket2Service),
        };
      });
    } else {
      await next();
    }
  };
  // const port = await getAFreePort(socksServerPort + 1);
  const httpService = await startDefaultServer([middleware], {port});
  const {server} = httpService;
  server.on('upgrade', async (req, socket, head) => {
    const {headers} = await getHttpIncomingMessageInfo(req);
    const upgrade = Object.entries(headers).reduce<object>((sum, [key, value]) => {
      sum[key.toLocaleLowerCase()] = value;
      return sum;
    }, {})['upgrade'];
    if (upgrade !== upgradeProtocol) {
      socket.destroy();
      return;
    }
    socket.write(
      'HTTP/1.1 101 Web Socket Protocol Handshake\r\n' +
        `Upgrade: ${upgradeProtocol}\r\n` +
        'Connection: Upgrade\r\n' +
        '\r\n'
    );
    const connectStatus = await handleConnection(socket as Socket, methodList, proxyAsSocketClientConfigList);
    onConnection(connectStatus);
    connectStatusList.push(connectStatus);
  });
  return httpService;
}
