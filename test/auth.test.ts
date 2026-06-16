import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  signHmacSha256,
  htxTimestamp,
  buildSignedRestParams,
  buildWsAuthParams,
} from '../src/util/auth';

// Golden values are independently computed (see test setup) and act as
// regression guards: if the signing scheme drifts, these break.

test('signHmacSha256 produces the expected base64 digest', () => {
  assert.equal(
    signHmacSha256('test-secret', 'hello'),
    'vMiJpAZnyrcV4dwirSgGks9L8cOigO7spg2NvNjkuZM=',
  );
});

test('htxTimestamp has no milliseconds and no trailing Z', () => {
  const ts = htxTimestamp(new Date('2020-01-01T00:00:00.123Z'));
  assert.equal(ts, '2020-01-01T00:00:00');
  assert.match(ts, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
});

test('buildSignedRestParams includes all required auth params', () => {
  const params = buildSignedRestParams({
    method: 'GET',
    host: 'api.huobi.pro',
    path: '/v1/account/accounts',
    apiKey: 'test-key',
    apiSecret: 'test-secret',
    timestamp: '2020-01-01T00:00:00',
  });

  assert.equal(params.AccessKeyId, 'test-key');
  assert.equal(params.SignatureMethod, 'HmacSHA256');
  assert.equal(params.SignatureVersion, '2');
  assert.equal(params.Timestamp, '2020-01-01T00:00:00');
  assert.ok(params.Signature, 'Signature must be present');
});

test('buildSignedRestParams matches the golden signature (GET, no extra query)', () => {
  const params = buildSignedRestParams({
    method: 'GET',
    host: 'api.huobi.pro',
    path: '/v1/account/accounts',
    apiKey: 'test-key',
    apiSecret: 'test-secret',
    timestamp: '2020-01-01T00:00:00',
  });

  assert.equal(params.Signature, 'Cq4vhc3Y2rvz8C6v0IWPe69xaE0wschhwRabS111VTE=');
});

test('buildSignedRestParams signs extra query params', () => {
  const params = buildSignedRestParams({
    method: 'GET',
    host: 'api.huobi.pro',
    path: '/v1/order/orders',
    apiKey: 'test-key',
    apiSecret: 'test-secret',
    timestamp: '2020-01-01T00:00:00',
    query: { symbol: 'btcusdt' },
  });

  assert.equal(params.symbol, 'btcusdt');
  assert.equal(params.Signature, 'PMD3W5hLDhIbxBfJNu+iNNn81iHCqvnpzZN7/CDE+WY=');
});

test('buildSignedRestParams ignores undefined/null query values', () => {
  const params = buildSignedRestParams({
    method: 'GET',
    host: 'api.huobi.pro',
    path: '/v1/account/accounts',
    apiKey: 'test-key',
    apiSecret: 'test-secret',
    timestamp: '2020-01-01T00:00:00',
    query: { foo: undefined, bar: null },
  });

  assert.ok(!('foo' in params));
  assert.ok(!('bar' in params));
  // Same as the no-extra-query golden, proving nothing snuck into the signature.
  assert.equal(params.Signature, 'Cq4vhc3Y2rvz8C6v0IWPe69xaE0wschhwRabS111VTE=');
});

test('buildWsAuthParams matches the golden signature and shape', () => {
  const params = buildWsAuthParams({
    host: 'api.huobi.pro',
    path: '/ws/v2',
    apiKey: 'test-key',
    apiSecret: 'test-secret',
    timestamp: '2020-01-01T00:00:00',
  });

  assert.equal(params.authType, 'api');
  assert.equal(params.accessKey, 'test-key');
  assert.equal(params.signatureMethod, 'HmacSHA256');
  assert.equal(params.signatureVersion, '2.1');
  assert.equal(params.timestamp, '2020-01-01T00:00:00');
  assert.equal(params.signature, 'bt5rdc6pvzRoO8WEvS7UbDlHrgVXqONnaGO7ZcQJ/XE=');
});

test('signatures are stable regardless of input timestamp generation', () => {
  // Two calls with the same explicit timestamp must be byte-identical.
  const a = buildWsAuthParams({
    host: 'api.huobi.pro',
    path: '/ws/v2',
    apiKey: 'test-key',
    apiSecret: 'test-secret',
    timestamp: '2020-01-01T00:00:00',
  });
  const b = buildWsAuthParams({
    host: 'api.huobi.pro',
    path: '/ws/v2',
    apiKey: 'test-key',
    apiSecret: 'test-secret',
    timestamp: '2020-01-01T00:00:00',
  });
  assert.deepEqual(a, b);
});
