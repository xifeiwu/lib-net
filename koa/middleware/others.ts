import {handleIncomingMessageByConfig, HttpConditionAndAction} from '../../service/external';

export function getCustomizeResponseMiddleware(customizeResponseConfigList: HttpConditionAndAction[]) {
  const handleRequestMiddleware = async (ctx, next) => {
    const {sentData} = await handleIncomingMessageByConfig(
      {
        request: ctx.req,
        response: ctx.res,
      },
      customizeResponseConfigList
    );
    if (!sentData) {
      await next();
    }
  };
  return handleRequestMiddleware;
}
