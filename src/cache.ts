import { TClassIndefiner, TypeServiceInjection } from '@flowx/container';
import { TRedis } from '.';
const encode = require('string-placeholder');

export const CacheMap = new Map<TClassIndefiner<any>, Map<string | symbol, {
  fn: Function,
  ttl?: number,
  key: string | Function
}>>();

export function cacheable(key: string | Function, ttl?: number): MethodDecorator {
  return (target, property, descriptor: TypedPropertyDescriptor<any>) => {
    const fn = descriptor.value;
    if (!CacheMap.has(target.constructor as TClassIndefiner<any>)) {
      CacheMap.set(
        target.constructor as TClassIndefiner<any>, 
        new Map<string | symbol, { fn: Function, ttl?: number, key: string | Function }>()
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

export async function buildCache<T = any>(target: TClassIndefiner<any>, property: string | symbol, ...args: any[]) {
  const redis = TypeServiceInjection.get<TRedis>('Redis');
  if (!redis) throw new Error('You must setup TypeRedis first.');
  if (!CacheMap.has(target)) throw new Error('Cannot find the cache build target');
  const _target = CacheMap.get(target);
  if (!_target.has(property)) throw new Error(`Cannot find the property <${property as string}> on target`);
  const { fn, ttl, key } = _target.get(property);
  const resValue = redis.invoke(target, fn, ...args);
  const result = await Promise.resolve<T>(resValue);
  const path = buildPathname(key, ...args);
  await redis.set(path, result || null, ttl);
  return result;
}

export async function deleteCache(target: TClassIndefiner<any> | string, property?: string | symbol, ...args: any[]): Promise<void> {
  const redis = TypeServiceInjection.get<TRedis>('Redis');
  if (!redis) throw new Error('You must setup TypeRedis first.');
  if (typeof target === 'string') return await redis.del(target);
  if (!CacheMap.has(target)) throw new Error('Cannot find the cache build target');
  const _target = CacheMap.get(target);
  if (!_target.has(property)) throw new Error(`Cannot find the property <${property as string}> on target`);
  const { key } = _target.get(property);
  
  const path = buildPathname(key, ...args);
  return await redis.del(path);
}

export function buildPathname(key: string | Function, ...args: any[]): string {
  return typeof key === 'function' ? key(...args) : encode(key, args);
}