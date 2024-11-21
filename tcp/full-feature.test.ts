import path from 'path';
import {startLocalFullFeatureServer} from './full-feature';
import {logColorful} from '../service/external';

export async function testFullFeatureServer() {
  const {host, port, koaConfig} = await startLocalFullFeatureServer({
    koaShortCutConfig: {
      staticDir: path.resolve(__dirname, '..'),
    },
  });
  logColorful({}, koaConfig);
  logColorful({}, `http://${host}:${port}`);
}
