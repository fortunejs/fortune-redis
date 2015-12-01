import testAdapter from 'fortune/test/adapter';
import RedisAdapter from '../../src';
import fredis from 'fakeredis';

testAdapter(RedisAdapter, {
  createClientFactory() {
    return fredis.createClient();
  },
});
