import {logColorful} from '../../../service/external';
import {startKoaServer} from '../../server';
import {upgradeMiddelware} from './mw-upgrade';
import {calNetSpeed} from './service';

export async function testUpload() {
  const {origin} = await startKoaServer({
    upgradeMiddlewares: [upgradeMiddelware],
  });
  await calNetSpeed({origin, type: 'upload', maxTry: 5}, ({speed}) => {
    logColorful({color: 'red'}, speed);
  });
}
