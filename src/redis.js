import Redis from 'ioredis'

/**
 * Create a RedisClient from options
 * @param options
 * @return {RedisClient}
 * @api private
 */
export const createClientFactory = (options = {}) => {
  const socket = options.socket
  const port = !socket ? (options.port || 6379) : null
  const host = !socket ? (options.host || '127.0.0.1') : null
  options.options = options.options || {}
  options.options.dropBufferSupport = true
  return new Redis(port, host, options)
}

export const configureFactory = (options = {}) => {
  return {
    createClient: () => {
      const clientFactoryMethod = options.createClientFactory || createClientFactory
      return clientFactoryMethod(options)
    },
  }
}

export default configureFactory
