import {Socket} from 'net';
import {requestAndGetUpgradeInfo, startSocketClient} from '../node';
import {
  ECommand,
  EMethod,
  UserPassInfo,
  getAddressType,
  ESocksState,
  TargetServiceInfo,
  ClientStatus,
  waitMethodReplied,
  waitUsernamePasswordAuthResultReplied,
  sendMethod,
  sendTargetServiceInfo,
  sendUsernamePassword,
  waitTargetServiceInfoReplied,
  upgradeProtocol,
  ClientConfig,
  getFailState,
} from './service';

export async function connectToSocksServer(config: ClientConfig) {
  const {socketConfig, httpUrl, methodList, targetServiceInfo: target} = config;
  /** Use authorized method first */
  methodList.sort((pre, next) => next.method - pre.method);
  const status: ClientStatus = {
    state: ESocksState.initial,
  };
  try {
    status.state = ESocksState.connecting;
    let socket: Socket;
    if (socketConfig) {
      socket = await startSocketClient(socketConfig);
    } else if (httpUrl) {
      const {socket: _socket} = await requestAndGetUpgradeInfo({
        url: httpUrl,
        headers: {
          Connection: 'Upgrade',
          Upgrade: upgradeProtocol,
        },
      });
      socket = _socket;
    } else {
      throw new Error(`Error: both socketConfig and httpUrl are not set.`);
    }

    status.state = ESocksState.connected;
    status.state = ESocksState.method_negotiation;
    await sendMethod(
      socket,
      methodList.map(it => it.method)
    );
    const method = await waitMethodReplied(
      socket,
      methodList.map(it => it.method)
    );
    status.state = ESocksState.method_negotiation_success;
    status.method = method;
    if (method === EMethod.UserPass) {
      const methodInfo = methodList.find(it => it.method === method) as {
        method: EMethod.UserPass;
        info: UserPassInfo;
      };
      status.state = ESocksState.auth_username_password_start;
      await sendUsernamePassword(socket, methodInfo.info);
      await waitUsernamePasswordAuthResultReplied(socket);
      status.state = ESocksState.auth_username_password_success;
    }
    {
      const {address, port} = target;
      const targetServiceInfo: TargetServiceInfo = {
        address,
        port,
        addressType: getAddressType(address),
      };
      await sendTargetServiceInfo(socket, {
        command: ECommand.CONNECT,
        ...targetServiceInfo,
      });
      status.targetServiceInfo = targetServiceInfo;
    }
    const replyServiceInfo = await waitTargetServiceInfoReplied(socket);
    status.replyServiceInfo = replyServiceInfo;
    socket.resume();
    status.socket = socket;
    status.state = ESocksState.success;
  } catch (err) {
    const failState = getFailState(status.state);
    if (failState) {
      status.state = failState;
    }
    status.error = err;
  }
  return status;
}
