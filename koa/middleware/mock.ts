import Koa from 'koa';
import {
  MockFileFinder,
  MockFileContent,
  ParamsForFindMockInfoInDir,
  RequestConfig,
  getMockFileFinderByDir,
  MockFileContentWithPathInfo,
  parseHttpBody,
} from '../../service/external';
// import {MockFileFinder} from '../../node/http/mock/find';
// import {deepEqual} from '@modules/lib/fe/common';
// import {GeneralDataToSave} from '@modules/conviva/service/request-by-select-config';
// import {IRequestConfig} from '@src/service/axios-wrapper';
// const {mock} = serverConfig;

// export interface MockFileExport extends GeneralDataToSave<any, any, any>, PayloadCompare {}
// export interface MockFileInfo extends MockFileExport {
//   relativePath: string;
// }

// function getMockFileInfo(relativePath: string): MockFileInfo {
//   const fullPath = path.resolve(__dirname, 'data', relativePath);
//   // console.log(fullPath);
//   if (!fs.existsSync(fullPath)) {
//     return null;
//   }
//   const mockFileExport = require(fullPath) as MockFileExport;
//   return {
//     ...mockFileExport,
//     relativePath,
//   };
// }
// export function getMockFileInfoList() {
//   return mock.fileList.map(getMockFileInfo).filter(it => it);
// }

function getRequestConfigFromKoaCtx(ctx: Koa.ParameterizedContext<any, any, any>): RequestConfig {
  const {
    method = 'get',
    path,
    query,
    state: {payload},
  } = ctx;
  return {
    method: method.toLowerCase(),
    pathname: path,
    query: {...query},
    data: payload,
  };
}

/**
 * Notice:
 * If ctx.req already parsed, save it in ctx.state.payload
 */
export const getMockMiddleware = (
  mockParams?: ParamsForFindMockInfoInDir[],
  options?: {
    allMockFileList: MockFileContentWithPathInfo[];
  }
) => {
  const {allMockFileList = []} = options ?? {};
  const finderList: MockFileFinder[] = [];
  for (const {mockFileList, finder} of (mockParams ?? [])
    .filter(param => !param.ingore)
    .map(param => getMockFileFinderByDir(param))) {
    allMockFileList.push(...mockFileList);
    finderList.push(finder);
  }
  const middleware = async (ctx: Koa.Context, next) => {
    const requestConfig = getRequestConfigFromKoaCtx(ctx);
    if (requestConfig.data === undefined && ctx.req.readable) {
      requestConfig.data = await parseHttpBody(ctx.req);
    }
    let target: (MockFileContent & {relativePath?: string}) | null = null;
    for (const finder of finderList) {
      target = finder(requestConfig);
      if (target) {
        break;
      }
    }
    if (target) {
      ctx.status = 200;
      ctx.type = 'json';
      ctx.set('z-mock-source', `${target.relativePath}`);
      ctx.body = target.resData;
    } else {
      await next();
    }
  };
  return middleware;
};
