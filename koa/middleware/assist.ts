import KoaRouter from 'koa-router';
import {formatDate, fromBuffer, getStreamData} from '../../external';

const router = new KoaRouter({
  prefix: '/api/assist',
});

const MAX_DATA_LIST_LENGTH = 100;
interface DataItem {
  id: string;
  data?: any;
}
const dataList: Array<DataItem> = [];
/**
 * Push to proxyStatusList, and return the item.
 */
function pushDataList(data?: any) {
  const dt = formatDate(new Date(), 'MM-ddThh:mm:ss.SSS');
  let newId = dt;
  let cnt = 0;
  while (dataList.some(it => it.id === newId) && cnt < MAX_DATA_LIST_LENGTH) {
    newId = `${dt}-${cnt}`;
    cnt++;
  }
  const item: DataItem = {id: newId, data};
  if (dataList.length > MAX_DATA_LIST_LENGTH) {
    dataList.pop();
  }
  dataList.unshift(item);
  return item;
}

router.post('/data/upload', async ctx => {
  const jsonData = fromBuffer(await getStreamData(ctx.req), 'json');
  ctx.type = 'json';
  ctx.body = pushDataList(jsonData);
});

router.get('/data/list', async (ctx, next) => {
  const {query} = ctx;
  const {id} = query;
  let resData: any = null;
  if (id) {
    resData = dataList.find(it => it.id === id);
  } else {
    resData = dataList;
  }
  ctx.type = 'json';
  ctx.body = resData;
});
router.get('/data/clear', async (ctx, next) => {
  const originLength = dataList.length;
  dataList.length = 0;
  ctx.type = 'json';
  ctx.body = originLength;
});

const middlewareDebug = router.routes();

export default middlewareDebug;
