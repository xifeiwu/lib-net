export {getMockMiddleware} from './middleware/mock';
import cors from './middleware/cors';
import log from './middleware/log';
import debug from './middleware/debug';
import assist from './middleware/logs';
import errorCatchMiddleware from './middleware/error-catch';
export {cors, log, debug, assist, errorCatchMiddleware};
export * from './server';
