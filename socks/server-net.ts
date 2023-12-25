import net, {ServerOpts, Socket} from 'net';
import dns from 'dns';
import {MethodAuthInfo} from './service/client';
import Koa from 'koa';
import {
  replyMethod,
  replyTargetServiceInfo,
  replyUsernamePasswordAuthResult,
  waitMethod,
  waitTargetServiceInfo,
  waitUsernamePassword,
} from './service/server';
import {
  ConnectServiceInfo,
  ConnectStatus,
  EAddressType,
  EMethod,
  ERRORS,
  ESocksState,
  ETargetServiceConnectState,
  TargetServiceInfo,
  UserPassInfo,
  createError,
  getAddressType,
  getInfoFromFirstChunk,
  getSocketInfo,
  ip2Bytes,
} from './service';
import {startDefaultServer} from '../koa';
import {deepClone, deepEqual, getAFreePort, isNumber, startSocketClient} from '../node';

interface ServerConfig {
  methodList: Array<MethodAuthInfo>;
  serverConfig: {
    host?: string;
    port?: number;
    options?: ServerOpts;
  };
  /** start a http server or not(http server can be used to show status of socks server) */
  isStartHttpServer?: boolean;
  /** on fail duration socks conversation */
  onConnection: (status: ConnectStatus) => void;
}

async function handleConnection(socket: Socket, methodList: Array<MethodAuthInfo>) {
  // socket.pause();
  const status: ConnectStatus = {
    state: ESocksState.connected,
    socket,
  };
  try {
    status.state = ESocksState.method_negotiation;
    const method = await waitMethod(
      socket,
      methodList.map(it => it.method)
    );
    await replyMethod(socket, method);
    status.state = ESocksState.method_negotiation_success;
    status.method = method;
    if (method === EMethod.UserPass) {
      const methodInfo = methodList.find(it => it.method === method) as {
        method: EMethod.UserPass;
        info: UserPassInfo;
      };
      status.state = ESocksState.auth_username_password_start;
      const userInfo = await waitUsernamePassword(socket);
      const authSuccess = deepEqual(
        methodInfo.info,
        Object.entries(userInfo).reduce<object>((sum, [key, value]) => {
          sum[key] = value.toString();
          return sum;
        }, {})
      );
      if (!authSuccess) {
        throw createError(ERRORS.username_password_auth_fail);
      }
      await replyUsernamePasswordAuthResult(socket, authSuccess);
      status.state = ESocksState.auth_username_password_success;
    }
    status.state = ESocksState.wait_targer_service_info;
    const targetServiceInfo = await waitTargetServiceInfo(socket);
    status.targetServiceInfo = targetServiceInfo;
    const replyServiceInfo = deepClone<ConnectServiceInfo>(targetServiceInfo);

    const isDomain = net.isIP(targetServiceInfo.address) === 0;
    if (isDomain) {
      try {
        const ip = await new Promise<string>((resolve, reject) => {
          dns.lookup(targetServiceInfo.address, function (err, ip) {
            if (err) {
              reject(err);
            } else {
              resolve(ip);
            }
          });
        });
        replyServiceInfo.address = ip;
        replyServiceInfo.addressType = getAddressType(ip);
      } catch (err) {
        await replyTargetServiceInfo(socket, {
          reply: ETargetServiceConnectState.Host_unreachable,
          ...replyServiceInfo,
        });
        throw err;
      }
    }

    status.replyServiceInfo = replyServiceInfo;
    let socket2Service: Socket;
    try {
      socket2Service = await new Promise((res, rej) => {
        const socket = new Socket();
        socket.on('connect', () => {
          res(socket);
        });
        socket.on('error', err => {
          rej(ETargetServiceConnectState.general_SOCKS_server_failure);
        });
        socket.on('timeout', err => {
          rej(ETargetServiceConnectState.general_SOCKS_server_failure);
        });
        socket.connect({
          host: replyServiceInfo.address,
          port: replyServiceInfo.port,
        });
      });
    } catch (err) {
      await replyTargetServiceInfo(socket, {
        reply: err as ETargetServiceConnectState,
        ...replyServiceInfo,
      });
      throw err;
    }

    // const ipType = ip2Bytes(socket.localAddress || '127.0.0.1');
    await replyTargetServiceInfo(socket, {
      reply: ETargetServiceConnectState.succeeded,
      ...replyServiceInfo,
    });
    socket.pipe(socket2Service).pipe(socket);
    socket.resume();
    status.socket2Service = socket2Service;
    status.state = ESocksState.success;
    socket2Service.on('close', () => {
      status.state = ESocksState.finsih;
    });
  } catch (err) {
    status.error = err;
  }
  return status;
}

export async function startSocksServer(config: ServerConfig) {
  const {
    methodList,
    serverConfig: {host, port, options},
    isStartHttpServer: isStartHttpServer,
    onConnection,
  } = config;
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
        const connectStatus = await handleConnection(socket, methodList);
        onConnection(connectStatus);
        connectStatusList.push(connectStatus);
      } else if (protocol === 'http' && httpService) {
        const socket2Http = await startSocketClient({
          host: '127.0.0.1',
          port: httpService.port,
        });
        socket2Http.write(chunk);
        socket.pipe(socket2Http).pipe(socket);
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
      port: socksServerPort,
    },
    httpService,
  };
}
