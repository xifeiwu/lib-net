export {getMockMiddleware} from './middleware/mock';
export * from './service';
export * from './server';
export * from './types';
export * from './on-tcp';

import cors from './middleware/cors';
export {getLogMiddleware} from './middleware/log';
export {cors as corsMw};
