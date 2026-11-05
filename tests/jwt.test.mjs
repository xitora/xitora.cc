// jwt.ts 유틸리티 단위 테스트
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {
  base64UrlDecode,
  decodeJwt,
  formatUnixTimestamp,
  getRelativeTimeText,
  evaluateTokenStatus,
  verifyHmacSignature,
  JWT_SAMPLE_PRESETS,
} from '../src/utils/jwt.ts';

test('base64UrlDecode: URL-safe Base64 및 UTF-8 한글 문자 디코딩 검증', () => {
  // {"name":"홍길동"}
  // Base64Url: eyJuYW1lIjoi7ZmN6ri466In0 -> standard base64 padding
  const sampleJson = JSON.stringify({ name: '홍길동' });
  const b64 = Buffer.from(sampleJson).toString('base64url');
  const decoded = base64UrlDecode(b64);
  assert.equal(decoded, sampleJson);
});

test('decodeJwt: 올바른 3단 JWT 구조 파싱 및 Header/Payload 디코딩 검증', () => {
  const sample = JWT_SAMPLE_PRESETS[0];
  const res = decodeJwt(sample.token);

  assert.equal(res.success, true);
  if (res.success) {
    assert.equal(res.data.header.alg, 'HS256');
    assert.equal(res.data.header.typ, 'JWT');
    assert.equal(res.data.payload.sub, 'user_891234');
    assert.equal(res.data.payload.name, 'Kim Dev');
    assert.equal(res.data.payload.exp, 1900000000);
  }
});

test('decodeJwt: 잘못된 토큰 형식(구역 부족, 잘못된 Base64) 방어 로직 검증', () => {
  const emptyRes = decodeJwt('');
  assert.equal(emptyRes.success, false);

  const invalidParts = decodeJwt('header.payload');
  assert.equal(invalidParts.success, false);

  const invalidJson = decodeJwt('invalidHeader.invalidPayload.invalidSig');
  assert.equal(invalidJson.success, false);
});

test('evaluateTokenStatus: 만료 토큰과 미래 유효 토큰 상태 판별 검증', () => {
  const now = 1700000000;

  // 1. 만료된 토큰
  const expiredStatus = evaluateTokenStatus({ exp: 1699999000 }, now);
  assert.equal(expiredStatus.status, 'expired');
  assert.equal(expiredStatus.isExpired, true);

  // 2. 유효한 토큰
  const validStatus = evaluateTokenStatus({ exp: 1700010000 }, now);
  assert.equal(validStatus.status, 'valid');
  assert.equal(validStatus.isExpired, false);

  // 3. nbf 제한으로 아직 활성화되지 않은 토큰
  const futureStatus = evaluateTokenStatus({ nbf: 1700005000, exp: 1700010000 }, now);
  assert.equal(futureStatus.status, 'future');

  // 4. exp 없는 영구 토큰
  const permStatus = evaluateTokenStatus({ sub: 'user' }, now);
  assert.equal(permStatus.status, 'valid');
  assert.equal(permStatus.isExpired, false);
});

test('formatUnixTimestamp: 유효한 날짜 포맷 반환 검증', () => {
  // 1700000000 = 2023-11-14 or 2023-11-15 depending on timezone
  const formatted = formatUnixTimestamp(1700000000);
  assert.match(formatted, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
});

test('verifyHmacSignature: 실제 서명 생성 및 Web Crypto 검증 일치/불일치 테스트', async () => {
  const secret = 'super-test-secret-key-999';
  const headerB64 = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payloadB64 = Buffer.from(JSON.stringify({ sub: '123', exp: 2000000000 })).toString('base64url');

  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(`${headerB64}.${payloadB64}`);
  const signatureB64 = hmac.digest('base64url');

  const token = `${headerB64}.${payloadB64}.${signatureB64}`;

  // 1. 올바른 키로 검증 -> true
  const validResult = await verifyHmacSignature(token, secret);
  assert.equal(validResult.verified, true);

  // 2. 잘못된 키로 검증 -> false
  const wrongKeyResult = await verifyHmacSignature(token, 'wrong-secret');
  assert.equal(wrongKeyResult.verified, false);

  // 3. 빈 키 검증 -> error
  const emptyKeyResult = await verifyHmacSignature(token, '');
  assert.equal(emptyKeyResult.verified, false);
  assert.ok(emptyKeyResult.error);
});
