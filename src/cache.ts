import { TClassIndefiner, TypeServiceInjection } from '@flowx/container';
import { TRedis } from '.';
const encode = require('string-placeholder');

type CacheMapItem<T> = Map<keyof T, {
  fn: any,
  ttl?: number,
  key: string | Function
}>

export const CacheMap = new Map<TClassIndefiner<any>, CacheMapItem<any>>();

export function cacheable(key: string | Function, ttl?: number): MethodDecorator {
  return (target: Object, property: string | symbol, descriptor: TypedPropertyDescriptor<any>) => {
    const fn = descriptor.value;
    if (!CacheMap.has(target.constructor as TClassIndefiner<any>)) {
      CacheMap.set(
        target.constructor as TClassIndefiner<any>, 
        new Map() as CacheMapItem<any>
      );
    }
    const clazz = CacheMap.get(target.constructor as TClassIndefiner<any>);
    clazz.set(property, { fn, ttl, key });
    descriptor.value = async function(...args: any[]) {
      const redis = TypeServiceInjection.get<TRedis>('Redis');
      if (!redis) throw new Error('You must setup TypeRedis first.');
      const path = buildPathname(key, ...args);
      const result = await redis.get(path);
      if (result !== undefined) return result;
      const res = await Promise.resolve(fn.apply(this, args));
      await redis.set(path, res || null, ttl);
      return res;
    }
  }
}

export function getCache<T>(target: TClassIndefiner<T>, property: keyof T) {
  const redis = TypeServiceInjection.get<TRedis>('Redis');
  if (!redis) throw new Error('You must setup TypeRedis first.');
  if (!CacheMap.has(target)) throw new Error('Cannot find the cache build target');
  const _target = CacheMap.get(target) as CacheMapItem<T>;
  if (!_target.has(property)) throw new Error(`Cannot find the property <${property}> on target`);
  return {
    get: Get(redis, target, property, _target),
    build: Build(redis, target, property, _target),
    delete: Delete(redis, _target, property),
  }
}

function Get<T>(
  redis: TRedis, 
  classModule: TClassIndefiner<T>, 
  property: keyof T, 
  target: CacheMapItem<T>
) {
  const { fn } = target.get(property);
  return async <G extends any[]>(...args: G) => {
    const resValue = redis.invoke<ReturnType<typeof fn>>(classModule, fn, args);
    return await Promise.resolve(resValue);
  }
  
}

function Build<T extends Object>(
  redis: TRedis, 
  classModule: TClassIndefiner<T>, 
  property: keyof T, 
  target: CacheMapItem<T>
) {
  const { ttl, key } = target.get(property);
  return async <G extends any[]>(...args: G) => {
    const result = await Get(redis, classModule, property, target)(...args);
    const path = buildPathname(key, ...args);
    await redis.set(path, result || null, ttl);
    return result;
  }
}

function Delete<T extends Object>(
  redis: TRedis, 
  target: CacheMapItem<T>, 
  property: keyof T
) {
  const { key } = target.get(property);
  return async (...args: any[]) => {
    const path = buildPathname(key, ...args);
    return await redis.del(path); 
  }
}

export function buildPathname(key: string | Function, ...args: any[]): string {
  return typeof key === 'function' ? key(...args) : encode(key, args);
}