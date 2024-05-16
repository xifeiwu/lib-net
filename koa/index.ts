export {getMockMiddleware} from './middleware/mock';
import cors from './middleware/cors';
import log from './middleware/log';
export * from './debug';
import assist from './middleware/logs';
import errorCatchMiddleware from './middleware/error-catch';
export * from './forum';
export {cors, log, assist, errorCatchMiddleware};
export * from './server';
