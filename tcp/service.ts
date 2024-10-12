import {PORT, TcpServerConfig} from '../external';

export const localTcpServerConfig: TcpServerConfig = {
  port: PORT.fullFeatureTcpServer.port,
  host: '0.0.0.0',
};
