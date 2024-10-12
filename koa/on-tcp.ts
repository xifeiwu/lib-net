import Koa from 'koa';
import {IncomingMessage, ServerResponse} from 'http';
import {
  HttpResponseInfo,
  tcpResponsePropsToBuffer,
  tryParseHttpHeaderPart,
  startSocketServer,
} from '../external';
import {Socket, ServerOpts} from 'net';

const KoaInstanceNotFound: HttpResponseInfo = {
  httpVersion: 'HTTP/1.1',
  statusCode: 404,
  statusMessage: 'No handler',
  headers: {
    'content-type': 'application/json',
  },
  data: {
    err: 'koa instance not found',
  },
};

export async function startTcpServer(
  options: {
    onConnection?: (socket: Socket) => Promise<boolean | void>;
    tcpHandler?: (firstChunk: Buffer, socket: Socket) => Promise<boolean | void>;
    koa?: Koa;
  },
  tcpOptions?: {
    host?: string;
    port?: number;
    options?: ServerOpts;
  }
) {
  const {tcpHandler, koa, onConnection} = options ?? {};
  const {host, port, server} = await startSocketServer(async socket => {
    if (onConnection && (await onConnection(socket))) {
      return;
    }
    const req = new IncomingMessage(socket);
    const {headerPartProps, dataConsumed} = await tryParseHttpHeaderPart(socket);
    if (!headerPartProps) {
      if (socket.writable) {
        if (tcpHandler) {
          tcpHandler(dataConsumed, socket);
        } else {
          socket.end('no handler found for this connection');
        }
      }
      return;
    }
    if (!koa) {
      socket.end(tcpResponsePropsToBuffer(KoaInstanceNotFound));
      return;
    }
    req.method = headerPartProps.method;
    req.url = headerPartProps.url;
    req.httpVersion = headerPartProps.httpVersion;
    // @ts-ignore
    req.headers = headerPartProps.headers;
    const res = new ServerResponse(req);
    res.assignSocket(socket);
    koa.callback()(req, res);
  }, tcpOptions);
  console.log(`start server: http://${host}:${port}`);
  return {host, port, server};
}
