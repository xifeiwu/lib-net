import net from 'net';
import {checkPort, getInfoFromFirstChunk} from './service';
import {SocketServerConfig} from './service/types';
import {startDefaultServer} from '../koa';
import {getAFreePort, isNumber, startSocketClient} from './external';
import {handleConnection} from './service/server';
import {handleCustomConnection} from './protocol-custom';
import {exposeStatusByHttp} from './service/http-server';

/**
 * Start a tcp server as socks server, enable a http server to expose connection status.
 * @param config
 * @returns
 */
export async function runSocksServerOnSocket(config: SocketServerConfig) {
  const {cipher, methodList, serverConfig, httpServerConfig, onConnection, proxyAsSocketClientConfigList} = config;
  await checkPort(serverConfig.port);
  httpServerConfig && await checkPort(httpServerConfig.port);
  const {host = '0.0.0.0', port, options} = serverConfig ?? {};
  const socksServerPort = isNumber(port) ? port : await getAFreePort();
  /** Use authorized method first */
  methodList.sort((pre, next) => next.method - pre.method);
  const {pushConnectStatus, koaMiddlewareList} = exposeStatusByHttp();
  let httpService: Awaited<ReturnType<typeof startDefaultServer>>;
  const handleConnectionFinal = cipher ? handleCustomConnection : handleConnection;

  const {server} = await new Promise<{server: net.Server}>((res, rej) => {
    const server = net.createServer(options, async socket => {
      const {protocol, chunk} = await getInfoFromFirstChunk(socket);
      // console.log(`protocol, chunk`);
      // console.log(protocol, chunk);
      if (protocol === 'socks5') {
        socket.push(chunk);
        const connectStatus = await handleConnectionFinal(socket, methodList, proxyAsSocketClientConfigList);
        onConnection(connectStatus);
        // connectStatusList.push(connectStatus);
        httpServerConfig && pushConnectStatus(connectStatus);
      } else if (protocol === 'http' && httpService) {
        const socket2Http = await startSocketClient({
          host,
          port: httpService.port,
        });
        socket2Http.write(chunk);
        socket.pipe(socket2Http).pipe(socket);
      } else {
        socket.end(`can not find protocol info by first chunk`);
      }
    });
    server.on('listening', () => {
      res({server});
    });
    server.on('error', err => {
      rej(err);
    });
    server.listen(socksServerPort, host);
  });
  if (httpServerConfig) {
    httpService = await startDefaultServer(koaMiddlewareList, {port: httpServerConfig.port});
  }
  return {
    socksService: {
      server,
      host,
      port: socksServerPort,
    },
    httpService,
  };
}
