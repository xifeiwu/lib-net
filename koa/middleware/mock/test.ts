import path from 'path';
import {recordHttpRequest, HttpRequestOptions, recursiveDeleteFile} from '../../../service/external';
import {startKoaServer} from '../../server';
import {mockKoaMw} from '.';

const MOCK_FILE_DIR = path.join(__dirname, 'mock-files');

export async function testMiddleware() {
  const {server} = await startKoaServer({
    requestMiddlewares: [
      mockKoaMw({
        getFileListOptions: [
          {
            targetDir: MOCK_FILE_DIR,
          },
        ],
      }),
    ],
    printOrigin: true,
  });
}
export async function generateMockFile() {
  const origin = 'http://elif.site/api/debug';
  const requestOptionsList: HttpRequestOptions[] = [
    {
      origin,
      pathname: '/echo',
    },
    {
      method: 'post',
      origin,
      pathname: '/echo',
      data: {
        a: 1,
      },
    },
    {
      method: 'post',
      origin,
      pathname: '/echo',
      data: {
        a: 2,
      },
    },
    {
      method: 'post',
      origin,
      pathname: '/custom',
      data: {
        delayMs: 1000,
      },
    },
    {
      method: 'post',
      origin,
      pathname: '/custom',
      data: {
        delayMs: 1000,
        responseCode: 204,
      },
    },
  ];
  for (const requestOptions of requestOptionsList) {
    const {} = await recordHttpRequest(requestOptions, {
      outputDir: MOCK_FILE_DIR,
    });
  }
}

export async function removeMockFiles() {
  recursiveDeleteFile(MOCK_FILE_DIR);
}
