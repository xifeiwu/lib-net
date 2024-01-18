import net from 'net';
import {getInfoFromFirstChunk, SocketServerConfig} from './service';
import {startDefaultServer} from '../koa';
import {getAFreePort, isNumber, startSocketClient} from '../node';
import {handleConnection} from './service/handle-connection';
import {exposeStatusByHttp} from './service/http-server';

/**
 * Start a tcp server as socks server, enable a http server to expose connection status.
 * @param config
 * @returns
 */
export async function startSocksServer(config: SocketServerConfig) {
  const {methodList, serverConfig, httpServerConfig, onConnection, proxyAsSocketClientConfigList} = config;
  const {host = '127.0.0.1', port, options} = serverConfig ?? {};
  const socksServerPort = isNumber(port) ? port : await getAFreePort();
  /** Use authorized method first */
  methodList.sort((pre, next) => next.method - pre.method);
  const {pushConnectStatus, koaMiddlewareList} = exposeStatusByHttp();
  let httpService: Awaited<ReturnType<typeof startDefaultServer>>;

  const {server} = await new Promise<{server: net.Server}>((res, rej) => {
    const server = net.createServer(options, async socket => {
      const {protocol, chunk} = await getInfoFromFirstChunk(socket);
      // console.log(`protocol, chunk`);
      // console.log(protocol, chunk);
      if (protocol === 'socks5') {
        socket.push(chunk);
        const connectStatus = await handleConnection(socket, methodList, proxyAsSocketClientConfigList);
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
