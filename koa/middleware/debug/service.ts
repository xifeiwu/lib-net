export const urlPrefix = '/api/debug';
export const wsPrefix = urlPrefix + '/upgrade';

export enum WS_PATH {
  echo = wsPrefix + '/echo',
  speedTest = wsPrefix + '/speed-test',
  broadcast = wsPrefix + '/broadcast',
}
