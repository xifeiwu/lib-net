import http from 'http';
import {GeneralRequestConfig, logWithColor, toUrl} from '../node';
import axios, {AxiosError, AxiosRequestConfig, AxiosResponse} from 'axios';

export type IRequestConfig = GeneralRequestConfig<AxiosRequestConfig>;
export type RequestFunc = <T>(config: IRequestConfig) => Promise<AxiosResponse<T>>;
/**
 * generate custom axios request
 */
export function axiosRequestFactory(defaultConfig: IRequestConfig = {}): RequestFunc {
  const instance = axios.create(defaultConfig);
  return async function request<T>(requestConfig: IRequestConfig) {
    const {url, urlParams, query} = requestConfig;
    requestConfig.url = toUrl({
      path: url,
      params: urlParams,
      query,
    });
    if (urlParams) {
      delete requestConfig.urlParams;
    }
    try {
      return await instance.request<T>(requestConfig);
    } catch (err) {
      throw err;
    }
  };
}

export function prettyConsoleAxiosError(err: AxiosError | Error, v1: boolean = true) {
  if (!(err as AxiosError).config) {
    throw err;
  }
  const {config, message, code, stack, request, response} = err as AxiosError;
  logWithColor('red', axiosConfigToCurlCommand(config));
  logWithColor('red', message, code);
  if (v1) {
    if (config.maxRedirects === 0) {
      const {data, method, baseURL, url} = config;
      if (request) {
        const {method, host, path, protocol} = request;
        // const firstLine = `${method} ${protocol}//${host}${path}`;
        const firstLine = `${method.toUpperCase()} ${baseURL}${url}`;
        logWithColor('black', firstLine, {...request.getHeaders()}, data);
      }
    } else {
      throw err;
    }
  } else {
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

export function axiosConfigToCurlCommand(
  config: Pick<AxiosRequestConfig<any>, 'url' | 'method' | 'headers' | 'auth' | 'params' | 'data'>
) {
  const {url, method, headers, auth, params, data} = config;
  if (auth) {
    const {username, password} = auth;
    headers['Authorization'] = 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');
  }
  if (params) {
    logWithColor('red', 'curl command may be error with params', params);
  }
  const command = [
    'curl',
    `-X ${method}`,
    url,
    ...Object.entries(headers).map(([k, v]) => {
      return `-H '${k}: ${v}'`;
    }),
    data ? `-d '${JSON.stringify(data)}'` : '',
  ].join(' ');
  return command;
}
