import testAdapter from 'fortune/test/adapter';
import RedisAdapter from '../../lib';
import fredis from 'fakeredis';

testAdapter(RedisAdapter, {
  createClientFactory() {
    return fredis.createClient();
  },
});
