import {getRandomBase64String, intWord} from '../../../service/external';
import {logColorful, requestAndGetUpgradeInfo} from '../../../../node';
import {startKoaServer} from '../../server';
import {upgradeMiddelware} from './mw-upgrade';
import {WS_PATH} from './service';

function getSpeedCal(options?: {sampleing: number}) {
  const {sampleing = 20} = options ?? {};
  const sizeList: {size: number; timestamp: number}[] = [];
  function pushSample(size: number) {
    if (sizeList.length > sampleing) {
      sizeList.shift();
    }
    sizeList.push({size, timestamp: Date.now()});
  }
  function calSpeed() {
    if (sizeList.length > 0) {
      const first = sizeList[0];
      const last = sizeList[sizeList.length - 1];
      const durition = last.timestamp - first.timestamp;
      const totalSize = sizeList.reduce<number>((sum, it) => {
        return sum + it.size;
      }, 0);
      const sizePerSecond = (totalSize * 1000) / durition;
      return `${intWord(sizePerSecond)}/s`;
    }
  }
  return {pushSample, calSpeed};
}
export async function testSpeed() {
  const {server, origin} = await startKoaServer({
    upgradeMiddlewares: [upgradeMiddelware],
  });
  const {socket, response, head} = await requestAndGetUpgradeInfo({
    origin,
    path: WS_PATH.speedTest,
    headers: {
      upgrade: 'test',
    },
  });
  const {pushSample, calSpeed} = getSpeedCal();
  socket.on('data', chunk => {
    const hex = chunk.toString();
    const values = hex.split(',').filter(it => it);
    let size = 0;
    for (const value of values) {
      size += parseInt(value, 16);
    }
    pushSample(size);
    logColorful({color: 'red'}, calSpeed());
  });

  function writeUntilFull() {
    let cnt = 0;
    let size = 0;
    const chunkSize = 64 * 1024;
    /** Try 512M */
    while (cnt++ < 16 * 512) {
      const success = socket.write(getRandomBase64String(chunkSize));
      size += chunkSize;
      if (!success) {
        break;
      }
    }
    // logColorful({color: 'yellow'}, size);
    return true;
  }
  writeUntilFull();
  socket.on('drain', writeUntilFull);
}
