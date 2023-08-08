import http from 'http';
import {logWithColor} from '../node';
import {AxiosError} from 'axios';

export function prettyConsoleAxiosError(err: AxiosError | Error) {
  if (!(err as AxiosError).isAxiosError) {
    return;
  }
  const {config, message, code, stack, request, response} = err as AxiosError;
  logWithColor('red', message, code);
  if (config.maxRedirects === 0) {
    const {data} = config;
    if (request) {
      const {method, host, path, protocol} = request;
      logWithColor('black', `${method} ${protocol}//${host}${path}`, {...request.getHeaders()}, data);
    }
  }
  if (response) {
    const {status, statusText, headers, data} = response;
    logWithColor('red', `${status} ${statusText}`);
    logWithColor('black', {...headers}, data as any);
  } else {
    logWithColor('red', 'No response');
  }
}
