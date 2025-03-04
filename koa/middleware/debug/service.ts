import {
  CanConvertToBuffer,
  logColorful,
  requestAndGetUpgradeInfo,
  convertToBuffer,
  getSpeedCal,
  writeability,
  GetWritabilityOptions,
  WriterSpeedInfo,
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

export async function getUploadSpeed(origin: string, options?: GetWritabilityOptions) {
  const {socket, response, head} = await requestAndGetUpgradeInfo({
    origin,
    pathname: WS_PATH.netSpeedUpload,
    headers: {
      upgrade: 'test',
    },
  });

  const speedInfo = await writeability(socket, options);
  return speedInfo;
}

export async function getDownloadSpeed(origin: string, options?: GetWritabilityOptions) {
  const {intervalCb} = options ?? {};
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
    if (speedInfo && intervalCb) {
      intervalCb(speedInfo);
    }
  });
  return new Promise<WriterSpeedInfo>(res => {
    socket.on('end', () => {
      const speedInfo = calTotalSpeed();
      res(speedInfo);
    });
  });
}
