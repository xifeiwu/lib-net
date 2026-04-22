import {handleIncomingMessageByConfig, HttpConditionAndAction} from '../../service/external';

export {proxyKoaMw} from './proxy';

export function customizeResponseKoaMw(customizeResponseConfigList: HttpConditionAndAction[]) {
  const handleRequestMiddleware = async (ctx, next) => {
    const response = await handleIncomingMessageByConfig(
      {
        request: ctx.req,
        response: ctx.res,
      },
      customizeResponseConfigList
    );
    if (!response.writableEnded) {
      await next();
    }
  };
  return handleRequestMiddleware;
}
