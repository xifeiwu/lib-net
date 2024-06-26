import {
  GeneralRequestConfig,
  getUrlPropsFromConfig,
  isObject,
  logWithColor,
  urlPropsToHref,
} from '../external';
import axios, {AxiosError, AxiosRequestConfig, AxiosResponse} from 'axios';

export type CustomizedAxiosRequestConfig = GeneralRequestConfig<AxiosRequestConfig>;
export type AxiosRequestFunc = <T>(config: CustomizedAxiosRequestConfig) => Promise<AxiosResponse<T>>;

/**
 * generate custom axios request
 */
export function axiosRequestFactory(defaultConfig: CustomizedAxiosRequestConfig = {}) {
  const instance = axios.create(defaultConfig);
  return async function request<T>(requestConfig: CustomizedAxiosRequestConfig) {
    const {urlProps, restProps} = getUrlPropsFromConfig(requestConfig);
    const finalUrl = urlPropsToHref(urlProps);
    try {
      return await instance.request<T>({...restProps, url: finalUrl});
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

const concatenateURL = (url, baseURL) => new URL(url, baseURL).href;
export function axiosConfigToCurlCommand(axiosConfig: AxiosRequestConfig) {
  try {
    const {baseURL = '', url, method = 'GET', headers = {}, auth, data, params} = axiosConfig;
    if (auth) {
      const {username, password} = auth;
      headers.Authorization = 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');
    }
    const command = [
      'curl',
      `-X ${method.toUpperCase()}`,
      concatenateURL(url, baseURL),
      ...Object.entries(headers)
        .filter(([_k, v]) => {
          return !isObject(v);
        })
        .map(([k, v]) => {
          return `-H '${k}: ${v}'`;
        }),
      data !== undefined ? `-d ${isObject(data) ? "'" + JSON.stringify(data) + "'" : data}` : '',
    ];
    return command.join(' ');
  } catch (err) {
    /** Ignore */
  }
  return '';
}
