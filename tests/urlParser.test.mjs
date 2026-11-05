// urlParser.ts 단위 테스트
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseUrlString,
  buildUrlString,
  URL_SAMPLE_PRESETS,
} from '../src/utils/urlParser.ts';

test('parseUrlString: 완전한 URL 구성 요소 분해 검증', () => {
  const sample = 'https://api.example.com:8080/v1/users?name=john&role=admin#section2';
  const result = parseUrlString(sample);

  assert.equal(result.isValid, true);
  assert.equal(result.protocol, 'https');
  assert.equal(result.hostname, 'api.example.com');
  assert.equal(result.port, '8080');
  assert.equal(result.pathname, '/v1/users');
  assert.equal(result.hash, 'section2');
  assert.equal(result.params.length, 2);
  assert.equal(result.params[0].key, 'name');
  assert.equal(result.params[0].value, 'john');
  assert.equal(result.params[1].key, 'role');
  assert.equal(result.params[1].value, 'admin');
});

test('parseUrlString: 프로토콜 생략 시 https:// 자동 보정 검증', () => {
  const sample = 'example.com/search?q=typescript';
  const result = parseUrlString(sample);

  assert.equal(result.isValid, true);
  assert.equal(result.hostname, 'example.com');
  assert.equal(result.pathname, '/search');
  assert.equal(result.params[0].key, 'q');
  assert.equal(result.params[0].value, 'typescript');
});

test('buildUrlString: 파라미터 활성화/비활성화 및 해시 결합 검증', () => {
  const base = {
    protocol: 'https',
    hostname: 'test.org',
    pathname: '/api/feed',
    hash: 'top',
  };

  const params = [
    { id: '1', key: 'filter', value: 'hot', enabled: true },
    { id: '2', key: 'disabled_key', value: 'ignore_me', enabled: false },
    { id: '3', key: 'limit', value: '25', enabled: true },
  ];

  const built = buildUrlString(base, params);

  assert.equal(built, 'https://test.org/api/feed?filter=hot&limit=25#top');
});

test('URL_SAMPLE_PRESETS: 모든 프리셋 유효성 검증', () => {
  assert.equal(URL_SAMPLE_PRESETS.length >= 3, true);
  URL_SAMPLE_PRESETS.forEach((preset) => {
    const parsed = parseUrlString(preset.url);
    assert.equal(parsed.isValid, true);
    assert.equal(parsed.params.length > 0, true);
  });
});
