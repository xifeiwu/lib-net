import {Readable, Writable} from 'stream';
import {ConnectionInfo} from './types';
import {toBuffer} from '../external';
import {EAddressType, ECommand, ETargetServiceConnectState, TargetServiceInfo} from '../service/types';
import {
  ERRORS,
  address2Buffer,
  bufferToTargeServiceInfo,
  createError,
  getAddressType,
  port2Buffer,
} from '../service/protocol';
import {decript, encrypt, ivLength} from './cipher';
import {BinaryLike} from 'crypto';

/**
 * +----+------+----------+------+----------+
 * |VER | ULEN |  UNAME   | PLEN |  PASSWD  |
 * +----+------+----------+------+----------+
 * | 1  |  1   | 1 to 255 |  1   | 1 to 255 |
 * +----+------+----------+------+----------+
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
 *
 * combine auth and targetServerInfo together
 * +-----+------+----------+------+----------+-----+-------+------+----------+----------+
 * | IV  | ULEN |  UNAME   | PLEN |  PASSWD  | CMD |  RSV  | ATYP | DST.ADDR | DST.PORT |
 * +-----+------+----------+------+----------+-----+-------+------+----------+----------+
 * | 16  |  1   | 1 to 255 |  1   | 1 to 255 |  1  | X'00' |  1   | Variable |    2     |
 * +-----+------+----------+------+----------+-----+-------+------+----------+----------+
 */
export async function sendConnectionInfo(writer: Writable, info: ConnectionInfo) {
  const {iv, auth, targetServiceInfo} = info;
  const {username, password} = auth;
  const {
    command = ECommand.CONNECT,
    address,
    port,
    addressType = getAddressType(address),
  } = targetServiceInfo;
  return new Promise<void>(async (res, rej) => {
    const encryptedInfo = encrypt(
      toBuffer([
        username.length,
        username,
        password.length,
        password,
        command,
        0,
        addressType,
        address2Buffer(address, addressType),
        port2Buffer(port),
      ]),
      iv
    );

    if (!writer.writable) {
      return rej(createError(ERRORS.SocketUnWritable));
    }
    writer.write(toBuffer([iv, encryptedInfo]), err => {
      if (err) {
        rej(err);
      } else {
        res();
      }
    });
  });
}

export async function waitConectionInfo(reader: Readable) {
  reader.resume();
  return new Promise<ConnectionInfo>((res, rej) => {
    reader.once('data', (chunk: Buffer) => {
      reader.pause();
      const iv = chunk.subarray(0, ivLength);
      const buffer = decript(chunk.subarray(ivLength), iv);
      let baseIndex = 0;
      const usernameLength = buffer[baseIndex];
      baseIndex += 1;
      const username = buffer.subarray(baseIndex, baseIndex + usernameLength);
      baseIndex += usernameLength;
      const passwordLength = buffer[baseIndex];
      baseIndex += 1;
      const password = buffer.subarray(baseIndex, baseIndex + passwordLength);
      baseIndex += passwordLength;
      const command = buffer[baseIndex];
      baseIndex += 2;

      const {addressType, address, port} = bufferToTargeServiceInfo(buffer.subarray(baseIndex));
      if (address === undefined || port === undefined) {
        return rej(createError('Can not get domain/port info'));
      }
      res({
        iv,
        auth: {
          username: username.toString(),
          password: password.toString(),
        },
        targetServiceInfo: {
          command,
          addressType,
          address,
          port,
        },
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
    addressType?: EAddressType;
    address: string;
    port: number;
  },
  iv: BinaryLike
) {
  const {reply, addressType = EAddressType.IPV4, address, port} = state;
  return new Promise<void>((res, rej) => {
    if (!writer.writable) {
      return rej(createError(ERRORS.SocketUnWritable));
    }
    writer.write(
      encrypt(
        toBuffer([5, reply, 0, addressType, address2Buffer(address, addressType), port2Buffer(port)]),
        iv
      ),
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
export async function waitTargetServiceInfoReplied(reader: Readable, iv: BinaryLike) {
  reader.resume();
  return new Promise<TargetServiceInfo>((res, rej) => {
    reader.once('data', (chunk: Buffer) => {
      reader.pause();
      const buffer = decript(chunk, iv);
      const [version, reply, _reserve] = buffer;
      if (version !== 0x05) {
        return rej(createError(ERRORS.InvalidSocksVersion));
      }
      if (reply !== ETargetServiceConnectState.succeeded) {
        return rej(createError(ETargetServiceConnectState[reply]));
      }
      const {addressType, address, port} = bufferToTargeServiceInfo(buffer.subarray(3));
      res({
        addressType,
        address,
        port,
      });
    });
  });
}
