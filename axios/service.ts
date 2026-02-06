import {AxiosRequestConfig} from 'axios';

const concatenateURL = (url: string, baseURL: string) => new URL(url, baseURL).href;

const appendParamsToUrl = (url: string, params: AxiosRequestConfig['params']): string => {
  if (params === undefined || params === null) {
    return url;
  }

  const urlObject = new URL(url);

  if (params instanceof URLSearchParams) {
    for (const [key, value] of params.entries()) {
      urlObject.searchParams.append(key, value);
    }
    return urlObject.toString();
  }

  if (typeof params === 'string') {
    urlObject.search = params.startsWith('?') ? params : `?${params}`;
    return urlObject.toString();
  }

  if (typeof params === 'object') {
    Object.entries(params as Record<string, unknown>).forEach(([key, value]) => {
      if (value === undefined || value === null) {
        return;
      }

      if (Array.isArray(value)) {
        value.forEach(item => {
          if (item !== undefined && item !== null) {
            urlObject.searchParams.append(key, String(item));
          }
        });
        return;
      }

      urlObject.searchParams.append(key, String(value));
    });
  }

  return urlObject.toString();
};

export function axiosConfigToCurlCommand(axiosConfig: AxiosRequestConfig): string {
  try {
    const {baseURL = '', url, method = 'GET', headers = {}, auth, data, params} = axiosConfig;
    const finalHeaders = headers instanceof AxiosHeaders ? headers.toJSON() : headers;
    if (auth) {
      const {username, password} = auth;
      finalHeaders.Authorization = 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');
    }

    // Format data payload - properly escaped for shell
    let dataArg = '';
    if (data !== undefined) {
      let jsonString: string;

      if (typeof data === 'string') {
        // Data is already a string, use as-is
        jsonString = data;
      } else if (typeof data === 'object') {
        // Data is an object, stringify it
        jsonString = JSON.stringify(data);
      } else {
        // Primitive value
        jsonString = String(data);
      }

      // Escape single quotes for shell compatibility
      const escapedJson = jsonString.replace(/'/g, "'\"'\"'");
      dataArg = `-d '${escapedJson}'`;
    }

    const command = [
      'curl',
      `-X ${method.toUpperCase()}`,
      appendParamsToUrl(concatenateURL(url ?? '', baseURL ?? ''), params),
      ...Object.entries(finalHeaders)
        .filter(([, v]) => {
          return typeof v !== 'object';
        })
        .map(([k, v]) => {
          return `-H '${k}: ${v}'`;
        }),
      dataArg,
    ].join(' ');
    return command;
  } catch {
    /** Ignore */
  }
  return '';
}
