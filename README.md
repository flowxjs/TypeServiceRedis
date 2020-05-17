# @flowxjs/redis

基于TypeService的Redis缓存框架

## Install

```bash
$ npm i @flowxjs/redis
```

## Usage

```ts
import { cacheable, TypeRedis, buildCache, deleteCache } from '@flowx/redis';

const x = new TypeRedis({
  host: '129.211.10.111',
  memory: true,
});

class ABC {
  @cacheable('test:${0}:ttt:${1}', 3600)
  sum(a: number, b: number) {
    return a + b;
  }
}

const t = new ABC();

Promise.resolve(t.sum(8, 3))
.then(d => console.log('first value:', d))
.then(() => Promise.resolve(t.sum(8, 3)))
.then(d => console.log('cache value:', d))
.then(() => x.get('test:8:ttt:3'))
.then(d => console.log('redirect value:', d))
.then(() => buildCache(ABC, 'sum', 8, 3))
.then(() => t.sum(8, 3))
.then(d => console.log('build value:', d))
.then(() => deleteCache(ABC, 'sum', 8, 3))
.then(() => x.get('test:8:ttt:3'))
.then(d => console.log('delete value:', d));
```

output:

```
first value: 11
cache value: 11
redirect value: 11
build value: 11
delete value: undefined
```