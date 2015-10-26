# Fortune Redis Adapter

This is a [Redis](https://http://redis.io) adapter for [Fortune](http://fortunejs.com).


## Usage

Install the `fortune-redis` package from `npm`:

```git a
$ npm install fortune-redis
```

Then use it with Fortune:

```js
import fortune from 'fortune'
import redisAdapter from 'fortune-redis'

const store = fortune.create({
  adapter: { type: redisAdapter }
})
```


## Options

All of the options are enumerated [here](https://github.com/NodeRedis/node_redis).

Any node.js redis client library that conforms (or when adapted) to node_redis API can be injected into fortune-redis. You should only provide a createClientFactory function as a redis connection factory instead of providing node_redis connection options.

Below is a sample code to use fortune-redis with [fakeRedis](https://github.com/hdachev/fakeredis).

```js
import fortune from 'fortune'
import redisAdapter from 'fortune-redis'
import redis from 'fakeredis',

const store = fortune.create({
  adapter: { type: redisAdapter }
  options: {
  	createClientFactory() {
  	  return redis.createClient();
  	},
  },
});
```


## License

This software is licensed under the MIT License.
