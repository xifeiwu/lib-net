export {getMockMiddleware} from './middleware/mock';
import cors from './middleware/cors';
import log from './middleware/log';
import debug from './middleware/debug';
import assist from './middleware/assist';
import errorCatchMiddleware from './middleware/error-catch';
export {cors, log, debug, assist, errorCatchMiddleware};
export * from './server';
