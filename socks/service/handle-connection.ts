import dns from 'dns';
import {
  replyMethod,
  replyTargetServiceInfo,
  replyUsernamePasswordAuthResult,
  waitMethod,
  waitTargetServiceInfo,
  waitUsernamePassword,
  ConnectServiceInfo,
  ConnectStatus,
  EMethod,
  ERRORS,
  ESocksState,
  ETargetServiceConnectState,
  UserPassInfo,
  createError,
  getAddressType,
  MethodAuthInfo,
} from './';
import {deepClone, deepEqual} from '../../node';
import {Socket, isIP} from 'net';

export async function handleConnection(socket: Socket, methodList: Array<MethodAuthInfo>) {
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
