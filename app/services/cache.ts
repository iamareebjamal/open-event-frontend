/* eslint-disable no-console, prefer-rest-params */
import Service, { inject as service } from '@ember/service';
import DS from 'ember-data';

function pushToStore(store: DS.Store, data: any): any[] | any {
  console.log(data)
  const parsed = data?.value;
  if (Array.isArray(parsed)) {
    const items: any[] = []
    for (const item of parsed) {
      console.log(item, item.data.id)
      store.pushPayload(item);
      // items.push(store.peekRecord(item.data.type, item.data.id));
    }
    return items;
  } else {
    store.pushPayload(parsed);

    return store.peekRecord(parsed.data.type, parsed.data.id);
  }
}

function saveToStorage(key: string, value: any | null) {
  if (!value) {return}
  let serialized = null;
  if (Array.isArray(value.content)) {
    serialized = value.map((v: any, index: number) => {
      const item = v.serialize({ includeId: true });
      console.log(item, v, value.content[index])
      item.data.id = item.data.id ?? value.content[index].id
      return item;
    });
    console.log('>>>>>>>>>>>>', serialized, value.content)
  } else {
    serialized = value.serialize({ includeId: true });
  }

  localStorage.setItem(key, JSON.stringify({
    time  : Date.now(),
    value : serialized
  }));
}

export default class Cache extends Service.extend({
  // anything which *must* be merged to prototype here
}) {
  version = 'v1';

  @service store!: DS.Store;

  get prefix(): string {
    return 'cache:' + this.version + ':';
  }

  isExpired(data: { time: number, value: any} | null): boolean {
    // Item expired after 15 seconds
    return Boolean(data?.time && (Date.now() - data?.time) > 60 * 1000)
  }

  async passThrough(key: string, callable: () => any): Promise<any> {
    const value = await callable();
    saveToStorage(key, value);

    return value;
  }

  async cacheData(key: string, callable: () => any): Promise<any | null> {
    key = this.prefix + key;
    const stored = localStorage.getItem(key);
    try {
      if (stored) {
        const data = JSON.parse(stored);
        console.log(key, data)

        // if (!data.time) {
        //   // Invalid data structure
        //   return this.passThrough(key, callable);
        // }

        pushToStore(this.store, data);
        // const expired = this.isExpired(data);
        // const item = pushToStore(this.store, data);

        // if (expired) {
        //   // Revalidate resource while serving stale
        //   console.info('Item expired. Revalidating...', key);
        //   this.passThrough(key, callable);
        // }

        // return item;
        return callable()
      } else {
        return this.passThrough(key, callable);
      }
    } catch (e) {
      console.error('Error while loading value from cache using key: ' + key, e);

      return callable();
    }
  }

  async findAll(model: string, options: any | null): Promise<any> {
    const saved = await this.cacheData(model, () => this.store.findAll(model, options));
    if (saved) {return saved;}
    return this.store.peekAll(model);
  }

  async queryRecord(key: string, model: string, options: any | null): Promise<any> {
    const saved = await this.cacheData(key, () => this.store.queryRecord(model, options));
    if (saved) {return saved;}
    return this.store.peekRecord(model, 1);
  }

  async query(key: string, model: string, options: any | null): Promise<any> {
    return await this.cacheData(key, () => this.store.query(model, options));
  }

  clear(): void {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith(this.prefix)) {
        console.info('Clearing cache entry:', key);
        localStorage.removeItem(key);
      }
    }
  }

  constructor() {
    super(...arguments);
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('cache:')) {
        if (!key.startsWith(this.prefix)) {
          console.info('Removing previous cache entry:', key);
          localStorage.removeItem(key);
        }
      }
    }
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    'cache': Cache;
  }
}
