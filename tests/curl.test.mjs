// curl.ts 유틸리티 단위 테스트
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseCurlCommand,
  generateFetchCode,
  generateAxiosCode,
  generatePythonRequestsCode,
  generateGoCode,
  CURL_SAMPLE_PRESETS,
} from '../src/utils/curl.ts';

test('parseCurlCommand: 기본 GET 요청 파싱 검증', () => {
  const curl = 'curl https://api.github.com/users/xitora -H "User-Agent: Awesome-App"';
  const parsed = parseCurlCommand(curl);

  assert.notEqual(parsed, null);
  if (parsed) {
    assert.equal(parsed.url, 'https://api.github.com/users/xitora');
    assert.equal(parsed.method, 'GET');
    assert.equal(parsed.headers['User-Agent'], 'Awesome-App');
    assert.equal(parsed.data, null);
  }
});

test('parseCurlCommand: POST JSON 및 Auth 헤더 요청 파싱 검증', () => {
  const curl = `curl -X POST https://api.example.com/items -H "Content-Type: application/json" -d '{"name":"item1"}'`;
  const parsed = parseCurlCommand(curl);

  assert.notEqual(parsed, null);
  if (parsed) {
    assert.equal(parsed.url, 'https://api.example.com/items');
    assert.equal(parsed.method, 'POST');
    assert.equal(parsed.headers['Content-Type'], 'application/json');
    assert.equal(parsed.data, '{"name":"item1"}');
  }
});

test('parseCurlCommand: Basic Auth 파싱 검증', () => {
  const curl = 'curl -u "alice:password123" https://api.example.com/secure';
  const parsed = parseCurlCommand(curl);

  assert.notEqual(parsed, null);
  if (parsed) {
    assert.equal(parsed.auth?.username, 'alice');
    assert.equal(parsed.auth?.password, 'password123');
  }
});

test('generateCode: 언어별(Fetch, Axios, Python, Go) 코드 생성 검증', () => {
  const parsed = parseCurlCommand(
    `curl -X POST https://api.example.com/login -H "Content-Type: application/json" -d '{"user":"test"}'`
  );
  assert.notEqual(parsed, null);
  if (parsed) {
    const fetchCode = generateFetchCode(parsed);
    assert.match(fetchCode, /fetch\('https:\/\/api\.example\.com\/login'/);
    assert.match(fetchCode, /method: 'POST'/);

    const axiosCode = generateAxiosCode(parsed);
    assert.match(axiosCode, /axios\.post/);

    const pyCode = generatePythonRequestsCode(parsed);
    assert.match(pyCode, /requests\.post/);
    assert.match(pyCode, /json=payload/);

    const goCode = generateGoCode(parsed);
    assert.match(goCode, /http\.NewRequest\("POST"/);
  }
});

test('CURL_SAMPLE_PRESETS: 모든 샘플 프리셋이 올바르게 파싱되는지 검증', () => {
  for (const preset of CURL_SAMPLE_PRESETS) {
    const parsed = parseCurlCommand(preset.curl);
    assert.notEqual(parsed, null, `프리셋 실패: ${preset.title}`);
  }
});
