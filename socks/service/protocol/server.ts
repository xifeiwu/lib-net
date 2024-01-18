import {Readable, Writable} from 'stream';
import {ERRORS, address2Buffer, bufferToTargeServiceInfo, createError, port2Buffer} from './utils';
import {EMethod, ETargetServiceConnectState, ConnectServiceInfo, EAddressType} from './types';
import {toBuffer} from '../../external';

/**
 * +----+----------+----------+
 * |VER | NMETHODS | METHODS  |
 * +----+----------+----------+
 * | 1  |    1     | 1 to 255 |
 * +----+----------+----------+
 * o  X'00' NO AUTHENTICATION REQUIRED
 * o  X'01' GSSAPI
 * o  X'02' USERNAME/PASSWORD
 * o  X'03' to X'7F' IANA ASSIGNED
 * o  X'80' to X'FE' RESERVED FOR PRIVATE METHODS
 * o  X'FF' NO ACCEPTABLE METHODS
 */
export async function waitMethod(reader: Readable, supportedMethods: EMethod[]) {
  reader.resume();
  return new Promise<EMethod>((res, rej) => {
    reader.once('data', (chunk: Buffer) => {
      reader.pause();
      const [version, count, ...methods] = chunk;
      if (version !== 0x05) {
        return rej(createError(ERRORS.InvalidSocksVersion));
      }
      if (count !== methods.length) {
        return rej(createError(ERRORS.MethodCountNotCorrect));
      }
      const method = methods.find(it => supportedMethods.includes(it));
      if (method !== undefined) {
        res(method);
      } else {
        return rej(createError(ERRORS.invalid_methods));
      }
    });
  });
}

/**
 * +----+--------+
 * |VER | METHOD |
 * +----+--------+
 * | 1  |   1    |
 * +----+--------+
 * o  X'00' NO AUTHENTICATION REQUIRED
 * o  X'01' GSSAPI
 * o  X'02' USERNAME/PASSWORD
 * o  X'03' to X'7F' IANA ASSIGNED
 * o  X'80' to X'FE' RESERVED FOR PRIVATE METHODS
 * o  X'FF' NO ACCEPTABLE METHODS
 */
export async function replyMethod(writer: Writable, method: EMethod) {
  return new Promise<void>((res, rej) => {
    if (!writer.writable) {
      return rej(createError(ERRORS.SocketUnWritable));
    }
    writer.write(Buffer.from([5, method]), err => {
      if (err) {
        rej(err);
      } else {
        res();
      }
    });
  });
}

/**
 * +----+------+----------+------+----------+
 * |VER | ULEN |  UNAME   | PLEN |  PASSWD  |
 * +----+------+----------+------+----------+
 * | 1  |  1   | 1 to 255 |  1   | 1 to 255 |
 * +----+------+----------+------+----------+
 */
export async function waitUsernamePassword(reader: Readable) {
  return new Promise<{
    username: Buffer;
    password: Buffer;
  }>((res, rej) => {
    reader.resume();
    reader.once('data', (chunk: Buffer) => {
      reader.pause();
      const _version = chunk[0];
      const usernameLength = chunk[1];
      let baseIndex = 2;
      const username = chunk.subarray(baseIndex, baseIndex + usernameLength);
      baseIndex += usernameLength;
      const passwordLength = chunk[baseIndex];
      baseIndex += 1;
      const password = chunk.subarray(baseIndex, baseIndex + passwordLength);
      res({
        username,
        password,
      });
    });
  });
}

/**
 * +----+--------+
 * |VER | STATUS |
 * +----+--------+
 * | 1  |   1    |
 * +----+--------+
 * A STATUS field of X'00' indicates success.
 * If the server returns a `failure' (STATUS value other than X'00') status, it MUST close the connection.
 */
export async function replyUsernamePasswordAuthResult(writer: Writable, success: boolean) {
  return new Promise<void>((res, rej) => {
    if (!writer.writable) {
      return rej(createError(ERRORS.SocketUnWritable));
    }
    writer.write(Buffer.from([1, success ? 0 : 1]), err => {
      if (err) {
        rej(err);
      } else {
        res();
      }
    });
  });
}

/**
 * +----+-----+-------+------+----------+----------+
 * |VER | CMD |  RSV  | ATYP | DST.ADDR | DST.PORT |
 * +----+-----+-------+------+----------+----------+
 * | 1  |  1  | X'00' |  1   | Variable |    2     |
 * +----+-----+-------+------+----------+----------+
 * Where:
 * o  VER    protocol version: X'05'
 * o  CMD
 *     o  CONNECT X'01'
 *     o  BIND X'02'
 *     o  UDP ASSOCIATE X'03'
 *     o  RSV    RESERVED
 * o  ATYP   address type of following address
 * o  IP V4 address: X'01'
 *     o  DOMAINNAME: X'03'
 *     o  IP V6 address: X'04'
 *     o  DST.ADDR       desired destination address
 * o  DST.PORT desired destination port in network octet order
 */
export async function waitTargetServiceInfo(reader: Readable) {
  reader.resume();
  return new Promise<ConnectServiceInfo>((res, rej) => {
    reader.once('data', (chunk: Buffer) => {
      reader.pause();
      const [version, command, _reserve] = chunk;
      if (version !== 0x05) {
        return rej(createError(ERRORS.InvalidSocksVersion));
      }
      const {addressType, address, port} = bufferToTargeServiceInfo(chunk.subarray(3));
      if (address === undefined || port === undefined) {
        return rej(createError('Can not get domain/port info'));
      }
      res({
        command,
        addressType,
        address,
        port,
      });
    });
  });
}

/**
 * +----+-----+-------+------+----------+----------+
 * |VER | REP |  RSV  | ATYP | BND.ADDR | BND.PORT |
 * +----+-----+-------+------+----------+----------+
 * | 1  |  1  | X'00' |  1   | Variable |    2     |
 * +----+-----+-------+------+----------+----------+
 * Where:
 * o  VER    protocol version: X'05'
 * o  REP    Reply field:
 * o  X'00' succeeded
 *     o  X'01' general SOCKS server failure
 *     o  X'02' connection not allowed by ruleset
 *     o  X'03' Network unreachable
 *     o  X'04' Host unreachable
 *     o  X'05' Connection refused
 *     o  X'06' TTL expired
 *     o  X'07' Command not supported
 *     o  X'08' Address type not supported
 *     o  X'09' to X'FF' unassigned
 *     o  RSV    RESERVED
 * o  ATYP   address type of following address
 */
export async function replyTargetServiceInfo(
  writer: Writable,
  state: {
    reply: ETargetServiceConnectState;
    addressType: EAddressType;
    address: string;
    port: number;
  }
) {
  const {reply, addressType, address, port} = state;
  return new Promise<void>((res, rej) => {
    if (!writer.writable) {
      return rej(createError(ERRORS.SocketUnWritable));
    }
    writer.write(
      toBuffer([5, reply, 0, addressType, address2Buffer(address, addressType), port2Buffer(port)]),
      err => {
        if (err) {
          rej(err);
        } else {
          res();
        }
      }
    );
  });
}
