[![Code Climate](https://codeclimate.com/github/thibremy/fortune-redis/badges/gpa.svg)](https://codeclimate.com/github/thibremy/fortune-redis)

# Fortune Redis Adapter

This is a [Redis](https://http://redis.io) adapter for [Fortune](http://fortune.js.org).
This package now use [ioredis](https://github.com/luin/ioredis) instead of [node_redis](https://github.com/NodeRedis/node_redis)

## Usage

Install the `fortune-redis` package from `npm`:

```git 
$ npm install fortune-redis
```

Then use it with Fortune:

```js
import fortune from 'fortune'
import redisAdapter from 'fortune-redis'

const store = fortune({...},  {
  adapter: [
    redisAdapter,
    {
      url: 'redis://:authpassword@127.0.0.1:6380'
    }
  ]
})
```


## Adapter Options


Event    | Description
:------------- | :-------------
generateId   | Generate the _id key on a new document. It must be a function that accepts one argument, the record type, and returns a unique string or number. Optional.
reateClientFactory    | see below


Any node.js redis client library that conforms (or when adapted) to [ioredis](https://github.com/luin/ioredis) API can be injected into fortune-redis. You should only provide a createClientFactory function as a redis connection factory instead of providing ioredis connection options.

Below is a sample code to use fortune-redis with [ioredis-mock](https://github.com/stipsan/ioredis-mock).

```js
import fortune from 'fortune'
import redisAdapter from 'fortune-redis'
import RedisMock from 'ioredis-mock'

const store = fortune({...},  {
  adapter: [
    redisAdapter,
    {
      createClientFactory() {
        return new RedisMock()
      }
    }
  ]
})
```

## License

This software is licensed under the MIT License.
