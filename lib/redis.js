'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createClientFactory = createClientFactory;
exports.configureFactory = configureFactory;

var _redis = require('redis');

var _redis2 = _interopRequireDefault(_redis);

var _url = require('url');

var _url2 = _interopRequireDefault(_url);

var _coRedis = require('co-redis');

var _coRedis2 = _interopRequireDefault(_coRedis);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Create a RedisClient from options
 * @param options
 * @return {RedisClient}
 * @api private
 */
function createClientFactory(options) {
  var socket = options.socket;
  var port = !socket ? options.port || 6379 : null;
  var host = !socket ? options.host || '127.0.0.1' : null;

  var client = _redis2.default.createClient(socket || port, host, options.options);

  if (options.auth) {
    client.auth(options.auth);
  }

  if (options.db) {
    client.select(options.db);
  }

  return client;
}

function configureFactory() {
  var optionsArg = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

  var options = optionsArg;

  if (typeof options === 'string') {
    var connInfo = _url2.default.parse(options, true);
    if (connInfo.protocol !== 'redis:') {
      throw new Error('connection string must use the redis: protocol');
    }

    options = {
      port: connInfo.port || 6379,
      host: connInfo.hostname,
      options: connInfo.query
    };

    if (connInfo.auth) {
      options.auth = connInfo.auth.replace(/.*?:/, '');
    }
  }

  return {
    createClient: function createClient() {
      var clientFactoryMethod = options.createClientFactory || createClientFactory;
      var client = clientFactoryMethod(options);
      return (0, _coRedis2.default)(client);
    }
  };
}

exports.default = {
  configureFactory: configureFactory,
  createClientFactory: createClientFactory
};