import Service, { inject as service } from '@ember/service';
import { Fastboot } from 'global';

const EXPIRY_TIME = 5 * 60 * 1000; // 5 minutes

interface Item<T> {
  timestamp: number,
  value: T
}

export default class Cache extends Service {
   @service fastboot!: Fastboot;

  setItem<T>(key: string, value: T): T {
    if (this.fastboot.isFastboot)
      return value;

    localStorage.setItem('exp_cache:' + key, JSON.stringify({
      timestamp: new Date().getTime(),
      value
    }));

    return value;
  }

  async fetchItem<T>(key: string, fallbackFetcher: (key: string) => Promise<T | null>): Promise<T | null> {
    const fallback = async () => this.setItem(key, await fallbackFetcher(key));

    if (this.fastboot.isFastboot)
      return fallback();
    
    const itemJson = localStorage.getItem('exp_cache:' + key);
    if (itemJson == null) {
      return fallback();
    }

    try {
      const item = JSON.parse(itemJson) as Item<T>;
      const savedTime = item.timestamp;

      if (new Date().getTime() - savedTime < EXPIRY_TIME) {
        // Time delta is less than expiry time, so return the item
        return item.value;
      }

      return fallback();
    } catch (e) {
      console.error('Error while parsing stored item', itemJson, e);
      return fallback();
    }
  }

  getItem<T>(key: string, fallback: T | null = null): Promise<T | null> {
    return this.fetchItem(key, () => Promise.resolve(fallback));
  }

}

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    'cache': Cache;
  }
}
