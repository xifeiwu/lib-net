import net, {ServerOpts} from 'net';
import Koa from 'koa';
import {
  ConnectStatus,
  getInfoFromFirstChunk,
  getSocketInfo,
  MethodAuthInfo,
  ProxyAsSocksClientConfig,
} from './service';
import {startDefaultServer} from '../koa';
import {getAFreePort, isNumber, startSocketClient} from '../node';
import {handleConnection} from './service/handle-connection';

interface ServerConfig {
  methodList: Array<MethodAuthInfo>;
  serverConfig?: {
    host?: string;
    port?: number;
    options?: ServerOpts;
  };
  /** start a http server or not(http server can be used to show status of socks server) */
  isStartHttpServer?: boolean;
  /** proxy to other socks server */
  proxyAsSocketClientConfigList?: ProxyAsSocksClientConfig[];
  /** on fail duration socks conversation */
  onConnection: (status: ConnectStatus) => void;
}

/**
 * Start a tcp server as socks server, enable a http server to expose connection status.
 * @param config
 * @returns
 */
export async function startSocksServer(config: ServerConfig) {
  const {methodList, serverConfig, isStartHttpServer, onConnection, proxyAsSocketClientConfigList} = config;
  const {host = '127.0.0.1', port, options} = serverConfig ?? {};
  const socksServerPort = isNumber(port) ? port : await getAFreePort();
  /** Use authorized method first */
  methodList.sort((pre, next) => next.method - pre.method);
  const connectStatusList: ConnectStatus[] = [];
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
        connectStatusList.push(connectStatus);
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
  if (isStartHttpServer) {
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
    const port = await getAFreePort(socksServerPort + 1);
    httpService = await startDefaultServer([middleware], {port});
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
