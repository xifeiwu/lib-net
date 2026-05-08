import {startTcpGateway} from './server';

export async function testStartTcpGateway() {
  const {host, port} = await startTcpGateway({
    mwConfig: {
      assetsSyncUp: {
        dir: '/Users/Shared/assets',
        git: 'git@elif.site:fe/module/assets.git',
      },
    },
  });
  console.log(`Tcp gateway started at ${host}:${port}`);
}
