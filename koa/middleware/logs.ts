import KoaRouter from 'koa-router';
import {formatDate, fromBuffer, getDataFromReadable} from '../../service/external';
const MAX_DATA_LIST_LENGTH = 200;

export interface LogsMWOptions {
  maxCount?: number;
}
export default function logs(options?: LogsMWOptions) {
  const {maxCount = MAX_DATA_LIST_LENGTH} = options ?? {};
  const router = new KoaRouter({
    prefix: '/api/log',
  });

  interface DataItem {
    /** unique id of each log item */
    id: string;
    /** from which client this log comes */
    from: string;
    data?: any;
  }
  const dataList: Array<DataItem> = [];
  /**
   * Push to proxyStatusList, and return the item.
   */
  function pushDataList(data: any, tag: string) {
    const dt = formatDate(new Date(), 'MM-ddThh:mm:ss.SSS');
    let newId = dt;
    let cnt = 0;
    while (dataList.some(it => it.id === newId) && cnt < maxCount) {
      newId = `${dt}-${cnt}`;
      cnt++;
    }
    const item: DataItem = {id: newId, from: tag, data};
    while (dataList.length > maxCount) {
      dataList.pop();
    }
    dataList.unshift(item);
    return item;
  }

  router.post('/:from?', async ctx => {
    const {from = ''} = ctx.params;
    const jsonOrStr = fromBuffer(await getDataFromReadable(ctx.req), 'json');
    ctx.type = 'json';
    ctx.body = pushDataList(jsonOrStr, from);
  });

  router.get('/list', async (ctx, next) => {
    const {query} = ctx;
    const {id, tag} = query;
    ctx.type = 'json';
    ctx.body = dataList.filter(it => {
      const tagMatched = tag === undefined || it.from === tag;
      const idMatched = id === undefined || it.id === id;
      return tagMatched && idMatched;
    });
  });
  router.get('/clear', async (ctx, next) => {
    const originLength = dataList.length;
    dataList.length = 0;
    ctx.type = 'json';
    ctx.body = originLength;
  });
  const middlewareDebug = router.routes();
  return middlewareDebug;
}

// export default middlewareDebug;
