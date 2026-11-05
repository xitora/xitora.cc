// mockData.ts 유틸리티 단위 테스트
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateUUID,
  generateSingleRecord,
  generateMockDataSet,
  convertToCsv,
  MOCK_SCHEMA_PRESETS,
} from '../src/utils/mockData.ts';

test('generateUUID: UUID v4 정규식 패턴 검증', () => {
  const uuid = generateUUID();
  const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  assert.equal(uuidV4Regex.test(uuid), true);
});

test('generateSingleRecord: 스키마 필드별 데이터 생성 검증', () => {
  const schema = [
    { id: '1', key: 'userId', type: 'uuid' },
    { id: '2', key: 'userName', type: 'nameKo' },
    { id: '3', key: 'userEmail', type: 'email' },
    { id: '4', key: 'phone', type: 'phone' },
    { id: '5', key: 'age', type: 'number', min: 20, max: 30 },
    { id: '6', key: 'isActive', type: 'boolean' },
    { id: '7', key: 'signupDate', type: 'date' },
  ];

  const record = generateSingleRecord(schema);

  assert.equal(typeof record.userId, 'string');
  assert.equal(typeof record.userName, 'string');
  assert.equal(typeof record.userEmail, 'string');
  assert.equal(String(record.userEmail).includes('@'), true);
  assert.equal(typeof record.phone, 'string');
  assert.equal(String(record.phone).startsWith('010-'), true);
  assert.equal(typeof record.age, 'number');
  assert.equal(record.age >= 20 && record.age <= 30, true);
  assert.equal(typeof record.isActive, 'boolean');
  assert.equal(typeof record.signupDate, 'string');
});

test('generateMockDataSet: 요청한 개수만큼 데이터 생성 검증', () => {
  const schema = MOCK_SCHEMA_PRESETS[0].schema;
  const rows = generateMockDataSet(schema, 15);

  assert.equal(rows.length, 15);
  assert.equal(rows.every((r) => r.id && r.name && r.email), true);
});

test('convertToCsv: JSON 배열을 올바른 CSV 포맷으로 변환 검증', () => {
  const sample = [
    { id: '1', name: '홍길동', email: 'test@example.com' },
    { id: '2', name: '이순신', email: 'lee@example.com' },
  ];

  const csv = convertToCsv(sample);
  const lines = csv.split('\n');

  assert.equal(lines.length, 3);
  assert.equal(lines[0], 'id,name,email');
  assert.equal(lines[1], '"1","홍길동","test@example.com"');
  assert.equal(lines[2], '"2","이순신","lee@example.com"');
});
