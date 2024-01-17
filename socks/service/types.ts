import {ServerOpts, Socket, TcpNetConnectOpts} from 'net';

export enum ESocksState {
  initial = 'initial',
  connecting = 'connecting',
  connected = 'connected',
  connect_fail = 'connecting fail',
  method_negotiation = 'method negotiation',
  method_negotiation_success = 'method negotiation',
  method_negotiation_fail = 'method negotiation fail',
  auth_username_password_start = 'auth by username/password',
  auth_username_password_success = 'auth by username/password',
  auth_username_password_fail = 'failed auth by username/password',
  /** client only */
  send_request_info = 'send request info',
  send_request_info_success = 'send request info success',
  send_request_info_fail = 'send request info fail',
  receive_request_info_success = 'received request info success',
  /** server only */
  wait_targer_service_info = 'waiting target service info',
  connect_targer_service_success = 'connect target service success',
  connect_targer_service_fail = 'connect target service fail',
  success = 'success',
  finsih = 'finish',
}

/**
 * o  X'00' NO AUTHENTICATION REQUIRED
 * o  X'01' GSSAPI
 * o  X'02' USERNAME/PASSWORD
 * o  X'03' to X'7F' IANA ASSIGNED
 * o  X'80' to X'FE' RESERVED FOR PRIVATE METHODS
 * o  X'FF' NO ACCEPTABLE METHODS
 */
export enum EMethod {
  NoAuth = 0x00,
  GSSApi = 0x01,
  UserPass = 0x02,
  NoAcceptable = 0xff,
}

export type MethodAuthInfo = {method: EMethod.NoAuth} | {method: EMethod.UserPass; info: UserPassInfo};

export interface UserPassInfo {
  username: string;
  password: string;
}
export enum ECommand {
  CONNECT = 0x01,
  BIND = 0x02,
  UDP = 0x03,
}
export enum EAddressType {
  IPV4 = 0x01,
  DOMAINNAME = 0x03,
  IPV6 = 0x04,
}
export interface ClientConfig {
  methodList: Array<MethodAuthInfo>;
  /** get tcp connection by net.createConnection */
  socketConfig?: TcpNetConnectOpts;
  /** get tcp connection by http upgrade */
  httpUrl?: string;
  targetServiceInfo: Pick<ConnectServiceInfo, 'address' | 'port'>;
}

export interface TargetServiceInfo {
  addressType: EAddressType;
  address: string;
  port: number;
}
export interface ConnectServiceInfo extends TargetServiceInfo {
  command: ECommand;
}
export enum ETargetServiceConnectState {
  succeeded = 0x00,
  general_SOCKS_server_failure = 0x01,
  connection_not_allowed_by_ruleset = 0x02,
  Network_unreachable = 0x03,
  Host_unreachable = 0x04,
  Connection_refused = 0x05,
  TTL_expired = 0x06,
  Command_not_supported = 0x07,
  Address_type_not_supported = 0x08,
  to_FF_unassigned = 0x09,
}

export interface ClientStatus {
  state: ESocksState;
  method?: EMethod;
  targetServiceInfo?: TargetServiceInfo;
  replyServiceInfo?: TargetServiceInfo;
  socket?: Socket;
  error?: Error;
}

/** connect status on server side */
export interface ConnectStatus extends ClientStatus {
  socket2Service?: Socket;
  proxyAsClientStatus?: ClientStatus;
}

export interface MatchItem {
  address: string | RegExp;
  port: number;
}
/** proxy to another socks server when address/port meets condition in matches list */
export interface ProxyAsSocksClientConfig
  extends Pick<ClientConfig, 'methodList' | 'socketConfig' | 'httpUrl'> {
  matches: Array<MatchItem | string | RegExp>;
}

export interface CommonServerConfig {
  methodList: Array<MethodAuthInfo>;
  /** proxy to other socks server */
  proxyAsSocketClientConfigList?: ProxyAsSocksClientConfig[];
  /** on fail duration socks conversation */
  onConnection: (status: ConnectStatus) => void;
}

export interface SocketServerConfig extends CommonServerConfig {
  serverConfig?: {
    host?: string;
    port?: number;
    options?: ServerOpts;
  };
  /** start a http server or not(http server can be used to show status of socks server) */
  isStartHttpServer?: boolean;
}

export interface HttpServerConfig extends CommonServerConfig {
  serverConfig?: {
    host?: string;
    port?: number;
  };
}