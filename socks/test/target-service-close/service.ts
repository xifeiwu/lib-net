import {
  LogColors,
  getAFreePort,
  handleSocketEvents,
  killByPort,
  logWithColor,
  startSocketServer,
  writeDataByInterval,
} from '../../../node';
import { getSocketInfo } from '../../service';
import { colors, targetServerInfo } from './utils';

export async function start() {
  const {host, port} = targetServerInfo;
  await startSocketServer({host, port}, socket => {
    logWithColor(colors.targetServer, 'socket connect:', getSocketInfo(socket));
    handleSocketEvents(socket, {isServer: true, color: colors.targetServer});
  });
  logWithColor(colors.targetServer, `target service port: ${port}`);
}

start();