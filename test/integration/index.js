import { comment, run, ok } from 'tapdance';
import fredis from 'fakeredis';
import httpTest from 'fortune/test/integration/http_test';
import RedisAdapter from '../../src';

const test = httpTest.bind(null, {
  adapter: {
    type: RedisAdapter,
    options: {
      createClientFactory() {
        return fredis.createClient();
      },
    },
  },
});

run(() => {
  comment('root list');
  return test('/', null, response => {
    ok(response.status === 200, 'status is correct');
  });
});

run(() => {
  comment('list users');
  return test('/user', null, response => {
    ok(response.status === 200, 'status is correct');
  });
});

run(() => {
  comment('list animal');
  return test('/animal', null, response => {
    ok(response.status === 200, 'status is correct');
  });
});
