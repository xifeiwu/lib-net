export const urlPrefix = '/api/debug';
export const wsPrefix = urlPrefix + '/ws';

export enum WS_PATH {
  echo = wsPrefix + '/echo',
  broadcast = wsPrefix + '/broadcast',
}
