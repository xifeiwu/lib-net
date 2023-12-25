import net, {Socket} from 'net';
import {isNumber, toBuffer} from '../../node';

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
o  X'00' NO AUTHENTICATION REQUIRED
o  X'01' GSSAPI
o  X'02' USERNAME/PASSWORD
o  X'03' to X'7F' IANA ASSIGNED
o  X'80' to X'FE' RESERVED FOR PRIVATE METHODS
o  X'FF' NO ACCEPTABLE METHODS
 */
export enum EMethod {
  NoAuth = 0x00,
  GSSApi = 0x01,
  UserPass = 0x02,
  NoAcceptable = 0xff,
}
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

export const MethodList = Object.values(EMethod).filter(v => isNumber(v));

export const ERRORS = {
  InvalidSocksVersion: 'only socks version 5 supported',
  InvalidSchemaFormat: 'schema format is not correct',
  invalid_methods: 'all methods is not valid',
  IPv6NotSupported: 'ipv6 not supported',
  username_password_auth_fail: 'username/password auth fail',
  MORE_THAN_255_BYTES: 'size too long (limited to 255 bytes)',
  incorrect_address_type: 'addressType is not correct',
  CLIENT_AUTH_FAIL: 'userName/password not correct',
  INVALID_METHOD: 'method is invalid(NO_AUTH or USERNAME/PASSWORD)',
  InvalidSocksCommand:
    'An invalid SOCKS command was provided. Valid options are connect, bind, and associate.',
  InvalidSocksCommandForOperation:
    'An invalid SOCKS command was provided. Only a subset of commands are supported for this operation.',
  InvalidSocksClientOptionsDestination: 'An invalid destination host was provided.',
  InvalidSocksClientOptionsExistingSocket:
    'An invalid existing socket was provided. This should be an instance of stream.Duplex.',
  InvalidSocksClientOptionsProxy: 'Invalid SOCKS proxy details were provided.',
  InvalidSocksClientOptionsTimeout:
    'An invalid timeout value was provided. Please enter a value above 0 (in ms).',
  InvalidSocksClientOptionsProxiesLength: 'At least two socks proxies must be provided for chaining.',
  NegotiationError: 'Negotiation error',
  SocketClosed: 'Socket closed',
  ProxyConnectionTimedOut: 'Proxy connection timed out',
  InternalError: 'SocksClient internal error (this should not happen)',
  InvalidSocks4HandshakeResponse: 'Received invalid Socks4 handshake response',
  InvalidSocks5InitialHandshakeResponse: 'Received invalid Socks5 initial handshake response',
  InvalidSocks5IntiailHandshakeSocksVersion:
    'Received invalid Socks5 initial handshake (invalid socks version)',
  InvalidSocks5InitialHandshakeNoAcceptedAuthType:
    'Received invalid Socks5 initial handshake (no accepted authentication type)',
  InvalidSocks5InitialHandshakeUnknownAuthType:
    'Received invalid Socks5 initial handshake (unknown authentication type)',
  Socks5AuthenticationFailed: 'Socks5 Authentication failed',
  InvalidSocks5FinalHandshake: 'Received invalid Socks5 final handshake response',
  InvalidSocks5FinalHandshakeRejected: 'Socks5 proxy rejected connection',
  InvalidSocks5IncomingConnectionResponse: 'Received invalid Socks5 incoming connection response',
  Socks5ProxyRejectedIncomingBoundConnection: 'Socks5 Proxy rejected incoming bound connection',
  IPV4FormatNotCorrect: 'format of ipv4 address is not correct',
};

export function createError(message: string) {
  return new Error(message);
}
export function getAddressType(host: string): EAddressType {
  const type = net.isIP(host);
  if (type === 4) {
    return EAddressType.IPV4;
  } else if (type === 6) {
    return EAddressType.IPV6;
  }
  return EAddressType.DOMAINNAME;
}
export function ip2Bytes(str: string) {
  var type = net.isIP(str),
    nums,
    bytes,
    i;

  if (type === 4) {
    nums = str.split('.', 4);
    bytes = new Array(4);
    for (i = 0; i < 4; ++i) {
      if (isNaN((bytes[i] = +nums[i]))) throw new Error('Error parsing IP: ' + str);
    }
  } else if (type === 6) {
    // var addr = new ipv6.Address(str),
    //     b = 0,
    //     group;
    // if (!addr.valid)
    //   throw new Error('Error parsing IP: ' + str);
    // nums = addr.parsedAddress;
    // bytes = new Array(16);
    // for (i = 0; i < 8; ++i, b += 2) {
    //   group = parseInt(nums[i], 16);
    //   bytes[b] = group >>> 8;
    //   bytes[b + 1] = group & 0xFF;
    // }
  }

  return bytes;
}

export function address2Buffer(address: string, addressType: EAddressType) {
  // const type = net.isIP(address);
  const type = addressType;
  if (type === EAddressType.IPV4) {
    const nums = address.split('.', 4);
    const bytes = new Array(4);
    for (let i = 0; i < 4; ++i) {
      if (isNaN((bytes[i] = +nums[i]))) throw new Error('Error parsing IP: ' + address);
    }
    return Buffer.from(bytes);
  } else if (type === EAddressType.IPV6) {
    throw new Error(`ipv6 not support yet`);
  } else if (type === EAddressType.DOMAINNAME) {
    const length = address.length;
    if (length > 255) {
      throw createError(ERRORS.MORE_THAN_255_BYTES);
    }
    return toBuffer([length, address]);
  }
}
export function port2Buffer(port: number) {
  const high = (port >> 8) & 0xff;
  const low = port & 0xff;
  return toBuffer([high, low]);
}

export function bufferToTargeServiceInfo(buf: Buffer): Omit<ConnectServiceInfo, 'command'> {
  const [addressType] = buf;
  const remainBuffer = buf.subarray(1);
  if (!Object.values(EAddressType).includes(addressType)) {
    throw createError(ERRORS.incorrect_address_type);
  }
  let address: string;
  let port: number;
  if (addressType === EAddressType.DOMAINNAME) {
    // const [domainLength] = others;
    const domainLength = remainBuffer[0];
    let startIndex = 1;
    const domainBuf = remainBuffer.subarray(startIndex, startIndex + domainLength);
    startIndex += domainLength;
    if (startIndex >= remainBuffer.byteLength) {
      throw createError(ERRORS.InvalidSchemaFormat);
    }
    const portBuf = remainBuffer.subarray(startIndex, startIndex + 2);
    address = domainBuf.toString();
    port = (portBuf[0] << 8) + portBuf[1];
    console.log(address, port);
  } else if (addressType === EAddressType.IPV4) {
    const domainBuf = remainBuffer.subarray(0, 4);
    const portBuf = remainBuffer.subarray(4, 6);
    address = Array.prototype.join.call(domainBuf, '.');
    port = (portBuf[0] << 8) + portBuf[1];
  }
  return {addressType, address, port};
}

export function getSocketInfo(socket?: Socket) {
  if (!socket) {
    return null;
  }
  const {localAddress, localPort, remoteAddress, remotePort, writable, readable, destroyed, closed} = socket;
  const local = `${localAddress}:${localPort}`;
  const remote = `${remoteAddress}:${remotePort}`;
  const id = [local, '<-', remote].join('');
  return {id, readable, writable, destroyed, closed, localAddress, localPort, remoteAddress, remotePort};
}

export async function getInfoFromFirstChunk(reader: Socket) {
  reader.resume();
  return new Promise<{
    protocol: 'http' | 'socks5' | null;
    firstLine: string;
    chunk: Buffer;
  }>((res, rej) => {
    reader.once('data', (chunk: Buffer) => {
      reader.pause();
      const str = chunk.toString();
      let protocol: 'http' | 'socks5' | null = null;
      const firstLine = str.split(/[\r\n]+/)[0];
      if (/^([a-z]+?)\s([^\s]+)\s(http\/\d\.\d)$/i.test(firstLine)) {
        protocol = 'http';
      } else if (0x05 === chunk[0]) {
        protocol = 'socks5';
      }
      res({
        protocol,
        firstLine,
        chunk,
      });
    });
  });
}
