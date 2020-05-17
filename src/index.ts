import * as IORedis from 'ioredis';
import { TypeContainer } from '@flowx/container';
import cacheManager from 'cache-manager';
import { setRedistTarget } from './cache';

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
}

export class TypeRedis implements TRedis {
  private readonly container?: TypeContainer;
  private readonly cache: cacheManager.MultiCache;
  constructor(options: IORedis.RedisOptions & {
    ttl?: number,
    max?: number,
    memory?: boolean,
  }, container?: TypeContainer) {
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
    setRedistTarget(this);
    this.container && this.container.injection.bind('Redis').toConstantValue(this);
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
  constructor(options: TRedisStoreOptions & {
    ttl?: number,
    max?: number,
    memory?: boolean,
  }, container?: TypeContainer) {
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
    setRedistTarget(this);
    this.container && this.container.injection.bind('Redis').toConstantValue(this);
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