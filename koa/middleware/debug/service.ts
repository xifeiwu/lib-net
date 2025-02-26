import {
  getRandomBase64String,
  intWord,
  throttle,
  CanConvertToBuffer,
  logColorful,
  requestAndGetUpgradeInfo,
  convertToBuffer,
} from '../../../service/external';

export const urlPrefix = '/api/debug';
export const wsPrefix = urlPrefix + '/upgrade';

export enum WS_PATH {
  echo = wsPrefix + '/echo',
  netSpeedUpload = wsPrefix + '/net-speed/upload',
  netSpeedDownload = wsPrefix + '/net-speed/download',
  broadcast = wsPrefix + '/broadcast',
}

export async function echoDataOverTcp(config: {origin: string}, dataList: CanConvertToBuffer[]) {
  const {origin} = config;
  const {socket} = await requestAndGetUpgradeInfo({
    origin,
    path: WS_PATH.echo,
    headers: {
      upgrade: 'test',
    },
  });
  for (const data of dataList) {
    socket.write(convertToBuffer(data));
  }
  socket.on('data', chunk => {
    logColorful({}, chunk);
  });
}
function getSpeedCal(options?: {sampleing: number}) {
  const {sampleing = 200} = options ?? {};
  let totalSize = 0;
  let calCount = 0;
  const sizeList: {size: number; timestamp: number}[] = [];
  function pushSample(size: number) {
    if (sizeList.length > sampleing) {
      sizeList.shift();
    }
    sizeList.push({size, timestamp: Date.now()});
    totalSize += size;
  }
  function calSpeed() {
    if (sizeList.length > 10) {
      const first = sizeList[0];
      const last = sizeList[sizeList.length - 1];
      const durition = last.timestamp - first.timestamp;
      const totalSize = sizeList.reduce<number>((sum, it) => {
        return sum + it.size;
      }, 0);
      const sizePerSecond = (totalSize * 1000) / durition;
      calCount++;
      return `${intWord(sizePerSecond)}/s`;
    }
    return '';
  }
  function getTotalSize() {
    return totalSize;
  }
  function getCalCount() {
    return calCount;
  }
  return {pushSample, calSpeed, getTotalSize, getCalCount};
}

/**
 * Can only work with debug upgrade-middleware
 */
export async function calNetSpeed(
  config: {origin: string; type?: 'upload' | 'download'; maxTry?: number},
  cb: (result: {speed: string}) => void
) {
  const {origin, type = 'upload', maxTry = 512 * 1024 * 1024} = config;
  const chunkSize = 64 * 1024;

  const {pushSample, calSpeed, getTotalSize, getCalCount} = getSpeedCal();

  const maxSize = maxTry > chunkSize ? maxTry : undefined;
  const maxCal = maxTry < chunkSize ? maxTry : undefined;
  function shouldStop() {
    return (maxSize && maxSize < getTotalSize()) || (maxCal && maxCal < getCalCount());
  }

  const {socket, response, head} = await requestAndGetUpgradeInfo({
    origin,
    path: type === 'download' ? WS_PATH.netSpeedDownload : WS_PATH.netSpeedUpload,
    headers: {
      upgrade: 'test',
    },
  });
  const printSpeed = throttle(
    () => {
      const speed = calSpeed();
      if (speed) {
        // logColorful({color: 'red'}, speed);
        cb({speed});
      }
    },
    1000,
    false
  );
  if (type === 'download') {
    socket.on('data', chunk => {
      // const hex = chunk.toString();
      // console.log(hex);
      // const values = hex.split(',').filter(it => it);
      // let size = 0;
      // for (const value of values) {
      //   size += parseInt(value, 16);
      // }
      const size = chunk.byteLength;
      pushSample(size);
      printSpeed();
    });
  } else {
    async function writeUntilFull() {
      if (shouldStop()) {
        socket.end('');
        return;
      }
      let cnt = 0;
      let size = 0;
      /** Try 512M */
      while (cnt++ < 16 * 512) {
        const success = socket.write(getRandomBase64String(chunkSize));
        size += chunkSize;
        pushSample(chunkSize);
        if (!success) {
          break;
        }
      }
      printSpeed();
      // logColorful({color: 'yellow'}, size);
      // return true;
    }
    writeUntilFull();
    socket.on('drain', writeUntilFull);
    socket.on('end', chunk => {
      const hex = chunk.toString();
      cb({speed: parseInt(hex, 16) + ''});
    });
  }
}
