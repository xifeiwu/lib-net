import {Socket} from 'net';
import {checkPort, upgradeProtocol} from './service';
import {HttpServerConfig} from './service/types';
import {startDefaultServer} from '../koa';
import {getHttpIncomingMessageInfo} from './external';
import {handleConnection} from './service/server';
import {exposeStatusByHttp} from './service/http-server';

/**
 * Start a http server, can use http upgrade socket to run socks protocol.
 * @param config
 * @returns
 */
export async function runSocksServerOnHttp(config: HttpServerConfig) {
  const {methodList, serverConfig, onConnection, proxyAsSocketClientConfigList} = config;
  await checkPort(serverConfig.port);
  const {pushConnectStatus, koaMiddlewareList} = exposeStatusByHttp();
  const {host = '127.0.0.1', port} = serverConfig ?? {};
  /** Use authorized method first */
  methodList.sort((pre, next) => next.method - pre.method);
  const httpService = await startDefaultServer([...koaMiddlewareList], {port});
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
    pushConnectStatus(connectStatus);
  });
  return httpService;
}
