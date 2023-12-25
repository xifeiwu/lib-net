import net, {Socket, TcpNetConnectOpts} from 'net';
import {
  MethodAuthInfo,
  waitMethod,
  waitUsernamePasswordAuthResult,
  sendMethod,
  sendTargetServiceInfo,
  sendUsernamePassword,
  waitTargetServiceInfo,
} from './service/client';
import {startSocketClient} from '../node';
import {
  ECommand,
  EMethod,
  ConnectServiceInfo,
  UserPassInfo,
  getAddressType,
  ESocksState,
  TargetServiceInfo,
  ClientStatus,
} from './service';

interface ClientConfig {
  methodList: Array<MethodAuthInfo>;
  socketConfig: TcpNetConnectOpts;
  targetServiceInfo: Pick<ConnectServiceInfo, 'address' | 'port'>;
  replyServiceInfo?: TargetServiceInfo;
}

export async function connectToSocksServer(config: ClientConfig) {
  const {socketConfig, methodList, targetServiceInfo: target} = config;
  /** Use authorized method first */
  methodList.sort((pre, next) => next.method - pre.method);
  const status: ClientStatus = {
    state: ESocksState.initial,
  };
  try {
    status.state = ESocksState.connecting;
    const socket = await startSocketClient(socketConfig);
    status.state = ESocksState.connected;
    status.state = ESocksState.method_negotiation;
    await sendMethod(
      socket,
      methodList.map(it => it.method)
    );
    const method = await waitMethod(
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
      await waitUsernamePasswordAuthResult(socket);
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
    const replyServiceInfo = await waitTargetServiceInfo(socket);
    status.replyServiceInfo = replyServiceInfo;
    socket.resume();
    status.socket = socket;
    status.state = ESocksState.success;
  } catch (err) {
    let failState: ESocksState;
    switch (status.state) {
      case ESocksState.connecting:
        failState = ESocksState.connect_fail;
        break;
      case ESocksState.auth_username_password_start:
        failState = ESocksState.auth_username_password_fail;
        break;
      case ESocksState.method_negotiation:
        failState = ESocksState.method_negotiation_fail;
        break;
      case ESocksState.send_request_info:
        failState = ESocksState.send_request_info_fail;
        break;
    }
    if (failState) {
      status.state = failState;
    }
    status.error = err;
  }
  return status;
}
