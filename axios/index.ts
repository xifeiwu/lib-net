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
  if (v1 && !(err as AxiosError).isAxiosError) {
    throw err;
  }
  const {config, message, code, stack, request, response} = err as AxiosError;
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
    if (!config) {
      throw err;
    }
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
