import redis from 'redis';
import url from 'url';
import wrapper from 'co-redis';

/**
 * Create a RedisClient from options
 * @param options
 * @return {RedisClient}
 * @api private
 */
export function createClientFactory(options) {
  console.log('createClientFactory redis', arguments);
  const socket = options.socket;
  const port = !socket ? (options.port || 6379) : null;
  const host = !socket ? (options.host || '127.0.0.1') : null;

  const client = redis.createClient(socket || port, host, options.options);

  if (options.auth) {
    client.auth(options.auth);
  }

  if (options.db) {
    client.select(options.db);
  }

  return client;
}

export function configureFactory(optionsArg = {}) {
  let options = optionsArg;

  if (typeof options === 'string') {
    const connInfo = url.parse(options, true);
    if (connInfo.protocol !== 'redis:') {
      throw new Error('connection string must use the redis: protocol');
    }

    options = {
      port: connInfo.port || 6379,
      host: connInfo.hostname,
      options: connInfo.query,
    };

    if (connInfo.auth) {
      options.auth = connInfo.auth.replace(/.*?:/, '');
    }
  }

  return {
    createClient: () => {
      const clientFactoryMethod = options.createClientFactory || createClientFactory;
      const client = clientFactoryMethod(options);
      return wrapper(client);
    },
  };
}

export default {
  configureFactory: configureFactory,
  createClientFactory: createClientFactory,
};
