import {KoaStaticMiddlewareConfig} from '../../types';
import {KoaStaticConfig} from './types';
import {spaConfigToStaticConfig} from './service';

export function toKoaStaticConfigList(staticConfig: KoaStaticMiddlewareConfig): KoaStaticConfig[] {
  const {defaultOptions = {}, staticConfigList = [], spaConfigList = []} = staticConfig;
  const spaOptionsList = spaConfigList.map(config => spaConfigToStaticConfig(config, defaultOptions));
  const staticOptionsList = staticConfigList.map(config => {
    return {...config, ...defaultOptions};
  });
  return [...spaOptionsList, ...staticOptionsList];
}
