import dns from 'dns';
import {
  replyMethod,
  replyTargetServiceInfo,
  replyUsernamePasswordAuthResult,
  waitMethod,
  waitTargetServiceInfo,
  waitUsernamePassword,
  ERRORS,
  createError,
  getAddressType,
} from './protocol';
import {getMatchedProxyConfig, getFailState} from './utils';
import {
  ConnectServiceInfo,
  SocksStatusOnServerSide,
  EMethod,
  ESocksState,
  ETargetServiceConnectState,
  UserPassInfo,
  MethodAuthInfo,
  ProxyAsSocksClientConfig,
} from './types';
import {deepClone, deepEqual} from '../external';
import {Socket, isIP} from 'net';
import {connectToSocksServer} from './client';
import {pipeline} from 'stream';

/**
 * Handle new connection on sock server side
 * @param socket
 * @param methodList auth method supported
 * @param proxyAsSocketClientConfigList proxy the socket to a new socket which connect to a new socks server
 * @returns
 * Notice:
 * Close socket on socket error events of any error thrown during the logic process
 */
export async function handleConnection(
  socket: Socket,
  methodList: Array<MethodAuthInfo>,
  proxyAsSocketClientConfigList?: ProxyAsSocksClientConfig[]
) {
  // socket.pause();
  const status: SocksStatusOnServerSide = {
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
    const proxyAsClientConfig = (proxyAsSocketClientConfigList ?? []).find(
      getMatchedProxyConfig.bind(null, targetServiceInfo)
    );
    status.state = ESocksState.connect_to_targer_service;
    let socket2Service: Socket;
    if (proxyAsClientConfig) {
      const proxyAsClientStatus = await connectToSocksServer({...proxyAsClientConfig, targetServiceInfo});
      status.proxyAsClientStatus = proxyAsClientStatus;
      if (proxyAsClientStatus.error) {
        throw createError(ERRORS.proxy_error);
      }
      await replyTargetServiceInfo(socket, {
        reply: ETargetServiceConnectState.succeeded,
        ...proxyAsClientStatus.replyServiceInfo,
      });
      socket2Service = proxyAsClientStatus.socket;
    } else {
      const replyServiceInfo = deepClone<ConnectServiceInfo>(targetServiceInfo);

      const isDomain = isIP(targetServiceInfo.address) === 0;
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
    }
    status.state = ESocksState.connect_to_targer_service_success;
    pipeline(socket, socket2Service, err => {
      status.state = ESocksState.connect_between_targer_service_fail;
      status.error = err;
    });
    pipeline(socket2Service, socket, err => {
      status.state = ESocksState.connect_between_targer_service_fail;
      status.error = err;
    });
    socket.resume();
    status.socket2Service = socket2Service;
    status.state = ESocksState.success;
    socket2Service.on('close', () => {
      status.state = ESocksState.finsih;
    });
    socket2Service.on('error', err => {
      status.state = ESocksState.connect_to_targer_service_fail;
      if (socket2Service.writable) {
        socket2Service.end();
      }
      status.error = err;
    });
  } catch (err) {
    const {socket, socket2Service} = status;
    socket2Service.writable && socket2Service.end();
    socket.writable && socket.end();
    const failState = getFailState(status.state);
    if (failState) {
      status.state = failState;
    }
    status.error = err;
  }
  return status;
}
