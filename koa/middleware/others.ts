import {handleIncomingMessageByConfig, HttpConditionAndAction} from '../../service/external';

export {getProxyKoaMw} from './proxy';

export function getCustomizeResponseKoaMw(customizeResponseConfigList: HttpConditionAndAction[]) {
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
