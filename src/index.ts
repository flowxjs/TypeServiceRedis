import IORedis from 'ioredis';
import { TypeContainer, TClassIndefiner } from '@flowx/container';
import cacheManager from 'cache-manager';
import { Observable, Observer } from '@reactivex/rxjs';

export * from './cache';

const Redis = require('../redis.js');

export interface TRedisStoreOptions {
  clusterConfig: {
    nodes: IORedis.ClusterNode[],
    options: IORedis.ClusterOptions,
  }
}

export interface TRedis {
  set<T = any>(key: string, value: T, ttl?: number): Promise<void>,
  get<T = any>(key: string): Promise<T>,
  del(key: string): Promise<void>,
  reset(): Promise<void>,
  invoke<R = any, G extends any[] = []>(classModule: TClassIndefiner<any>, fn: Function, ...args: G): R | Promise<R>
}

export class TypeRedis implements TRedis {
  private readonly container?: TypeContainer;
  private readonly cache: cacheManager.MultiCache;
  constructor(container: TypeContainer, options: IORedis.RedisOptions & {
    ttl?: number,
    max?: number,
    memory?: boolean,
  }) {
    this.container = container;
    const redisCache = cacheManager.caching(Object.assign({ 
      store: Redis, 
      ttl: options.ttl || 0
    }, options));
    const pool: any[] = [redisCache];
    if (options.memory) {
      const memoryCache = cacheManager.caching({ 
        store: 'memory', 
        max: options.max || 100, 
        ttl: options.ttl || 0 
      });
      pool.unshift(memoryCache);
    }
    this.cache = cacheManager.multiCaching(pool);
    this.container.injection.bind('Redis').toConstantValue(this);
    this.container.useEffect((observer: Observer<string>) =>  {
      observer.next('Redis has been setup, you can use`@inject(\'Redis\')` to invoke, and you can use `@cacheable` decorator.');
      observer.complete();
      return Observable.create((observer: Observer<string>) => {
        observer.next('Redis has been closed.');
        observer.complete();
      })
    });
  }

  public invoke<R = any, G extends any[] = []>(classModule: TClassIndefiner<any>, fn: Function, ...args: G): R | Promise<R> {
    const target = this.container.injection.get(classModule);
    if (!target) throw new Error('Cannot find the taget');
    return fn.apply(target, args);
  }

  public set<T = any>(key: string, value: T, ttl: number = 0): Promise<void> {
    return new Promise((resolve, reject) => {
      this.cache.set(key, value, ttl, (err) => {
        if (err) return reject(err);
        resolve();
      });
    })
  }

  public get<T = any>(key: string): Promise<T> {
    return new Promise((resolve, reject) => {
      this.cache.get(key, (err, result: T) => {
        if (err) return reject(err);
        resolve(result);
      })
    })
  }

  public del(key: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.cache.del(key, (err) => {
        if (err) return reject(err);
        resolve();
      })
    })
  }

  public reset(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.cache.reset((err?: Error) => {
        if (err) return reject(err);
        resolve();
      })
    })
  }
}

export class TypeClusterRedis implements TRedis {
  private readonly container?: TypeContainer;
  private readonly cache: cacheManager.MultiCache;
  constructor(container: TypeContainer, options: TRedisStoreOptions & {
    ttl?: number,
    max?: number,
    memory?: boolean,
  }) {
    this.container = container;
    const redisCache = cacheManager.caching(Object.assign({ 
      store: Redis, 
      ttl: options.ttl || 0
    }, options));
    const pool: any[] = [redisCache];
    if (options.memory) {
      const memoryCache = cacheManager.caching({ 
        store: 'memory', 
        max: options.max || 100, 
        ttl: options.ttl || 0 
      });
      pool.unshift(memoryCache);
    }
    this.cache = cacheManager.multiCaching(pool);
    this.container.injection.bind('Redis').toConstantValue(this);
    this.container.useEffect((observer: Observer<string>) =>  {
      observer.next('Redis has been setup, you can use`@inject(\'Redis\')` to invoke, and you can use `@cacheable` decorator.');
      observer.complete();
      return Observable.create((observer: Observer<string>) => {
        observer.next('Redis has been closed.');
        observer.complete();
      })
    });
  }

  public invoke<R = any, G extends any[] = []>(classModule: TClassIndefiner<any>, fn: (...args: G) => R, ...args: G) {
    const target = this.container.injection.get(classModule);
    if (!target) throw new Error('Cannot find the taget');
    return fn.apply(target, args);
  }

  public set<T = any>(key: string, value: T, ttl: number = 0): Promise<void> {
    return new Promise((resolve, reject) => {
      this.cache.set(key, value, ttl, (err) => {
        if (err) return reject(err);
        resolve();
      });
    })
  }

  public get<T = any>(key: string): Promise<T> {
    return new Promise((resolve, reject) => {
      this.cache.get(key, (err, result: T) => {
        if (err) return reject(err);
        resolve(result);
      })
    })
  }

  public del(key: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.cache.del(key, (err) => {
        if (err) return reject(err);
        resolve();
      })
    })
  }

  public reset(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.cache.reset((err?: Error) => {
        if (err) return reject(err);
        resolve();
      })
    })
  }
}