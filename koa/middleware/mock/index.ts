import Koa from 'koa';
import {
  convertKeyToLowerCase,
  FindRecordFileOptions,
  getHttpRecordFinder,
  HttpRequestOptions,
} from '../../../service/external';
import {getRequestBodyOfCtx} from '../../service';
// import {MockFileFinder} from '../../node/http/mock/find';
// import {deepEqual} from '@modules/lib/js/common';
// import {GeneralDataToSave} from '@modules/conviva/common/service/request-by-select-config';
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

async function getRequestConfigFromKoaCtx(
  ctx: Koa.ParameterizedContext<any, any, any>
): Promise<HttpRequestOptions> {
  const {method = 'get', path, query} = ctx;
  const payload = await getRequestBodyOfCtx(ctx);
  return {
    method: method.toLowerCase(),
    pathname: path,
    query: {...query},
    data: payload,
  };
}

export const PATHNAME_MOCK_LIST = '/api/mock/list';
/**
 * Notice:
 * If ctx.req already parsed, save it in ctx.state.requestBody
 */
export const getMockMiddleware = (mockParams?: FindRecordFileOptions) => {
  const {getRecordFileList, finder} = getHttpRecordFinder(mockParams);
  const middleware = async (ctx: Koa.Context, next) => {
    const requestConfig = await getRequestConfigFromKoaCtx(ctx);
    const target = finder(requestConfig);
    if (target) {
      const {
        responseInfo: {statusCode, headers = {}, data},
      } = target;
      ctx.status = statusCode;
      const normalizedHeaders = convertKeyToLowerCase(headers);
      if (normalizedHeaders['content-type']) {
        ctx.type = normalizedHeaders['content-type'];
      }
      ctx.set('z-mitm-mock', `${target.relativePath}`);
      ctx.body = data;
    } else if (requestConfig.pathname === PATHNAME_MOCK_LIST) {
      ctx.type = 'json';
      ctx.body = getRecordFileList();
    } else {
      await next();
    }
  };
  return middleware;
};
