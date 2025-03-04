import {logColorful, requestAndGetUpgradeInfo, writeability, getSpeedCal} from '../../../service/external';
import {startKoaServer} from '../../server';
import {upgradeMiddelware} from './mw-upgrade';
import {WS_PATH} from './service';

export async function testUpload() {
  const {origin} = await startKoaServer({
    upgradeMiddlewares: [upgradeMiddelware],
  });

  const {socket, response, head} = await requestAndGetUpgradeInfo({
    origin,
    pathname: WS_PATH.netSpeedUpload,
    headers: {
      upgrade: 'test',
    },
  });

  const speedInfo = await writeability(socket, {
    intervalCb: info => {
      logColorful({color: 'green'}, info);
    },
  });
  logColorful({color: 'green'}, speedInfo);
}

export async function testDownload() {
  const {origin} = await startKoaServer({
    upgradeMiddlewares: [upgradeMiddelware],
  });
  const {socket, response, head} = await requestAndGetUpgradeInfo({
    origin,
    pathname: WS_PATH.netSpeedDownload,
    headers: {
      upgrade: 'test',
    },
  });
  const {pushSample, calIntervalSpeed, calTotalSpeed} = getSpeedCal();
  socket.on('data', chunk => {
    pushSample(chunk.byteLength);
    /** console interval speed will effect totalSpeed, as console action will cost some resource */
    const speedInfo = calIntervalSpeed();
    speedInfo && logColorful({}, speedInfo.speedWord);
  });
  socket.on('end', () => {
    const speedInfo = calTotalSpeed();
    speedInfo && logColorful({}, speedInfo.speedWord);
  });
}
