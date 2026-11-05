// worldTime.ts 유틸리티 단위 테스트
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  WORLD_CITIES,
  getZoneTimeInfo,
  calculateBusinessOverlap,
  encodeWorldTimeShare,
  decodeWorldTimeShare,
  getUtcOffsetString,
} from '../src/utils/worldTime.ts';

test('WORLD_CITIES: 프리셋에 서울, 런던, 뉴욕이 포함되어 있어야 함', () => {
  const ids = WORLD_CITIES.map((c) => c.id);
  assert.ok(ids.includes('seoul'));
  assert.ok(ids.includes('london'));
  assert.ok(ids.includes('new-york'));
});

test('getZoneTimeInfo: 타임존별 시각 및 포맷 정상 계산', () => {
  // 기준 시각: 2026-05-15 12:00:00 UTC (영국 서머타임 13:00, 서울 21:00, 뉴욕 서머타임 08:00)
  const testUtc = new Date(Date.UTC(2026, 4, 15, 12, 0, 0));

  const seoulInfo = getZoneTimeInfo(testUtc, 'Asia/Seoul', testUtc);
  assert.equal(seoulInfo.hours, 21);
  assert.equal(seoulInfo.dayOffset, 0);

  const londonInfo = getZoneTimeInfo(testUtc, 'Europe/London', testUtc);
  assert.equal(londonInfo.hours, 13); // BST (UTC+1)

  const nyInfo = getZoneTimeInfo(testUtc, 'America/New_York', testUtc);
  assert.equal(nyInfo.hours, 8); // EDT (UTC-4)
});

test('calculateBusinessOverlap: 복수 도시 간의 근무 시간 교집합 계산', () => {
  const testBase = new Date(Date.UTC(2026, 4, 15, 0, 0, 0));
  const cities = WORLD_CITIES.filter((c) => ['seoul', 'tokyo'].includes(c.id));

  const { hourlyOverlaps, goldenRanges } = calculateBusinessOverlap(cities, testBase, 9, 18);
  assert.equal(hourlyOverlaps.length, 24);
  // 서울과 도쿄는 동일한 타임존(UTC+9)이므로 골든 타임이 정확히 9시간 존재해야 함
  assert.ok(goldenRanges.length > 0);
  assert.ok(goldenRanges[0].isAllOverlap);
});

test('encode/decodeWorldTimeShare: 쿼리 파라미터 직렬화 및 역직렬화 왕복 검증', () => {
  const cityIds = ['seoul', 'london', 'san-francisco'];
  const ts = 1712739600000;
  const encoded = encodeWorldTimeShare(cityIds, ts);

  const decoded = decodeWorldTimeShare(encoded);
  assert.deepEqual(decoded.cityIds, cityIds);
  assert.equal(decoded.timestampMs, ts);
});

test('getUtcOffsetString: 서울, 런던, 뉴욕 타임존의 UTC +- 오프셋 문자열 반환 검증', () => {
  const summerDate = new Date(Date.UTC(2026, 4, 15, 12, 0, 0));
  assert.equal(getUtcOffsetString('Asia/Seoul', summerDate), 'UTC+9');
  assert.equal(getUtcOffsetString('Europe/London', summerDate), 'UTC+1'); // BST
  assert.equal(getUtcOffsetString('America/New_York', summerDate), 'UTC-4'); // EDT

  const winterDate = new Date(Date.UTC(2026, 0, 15, 12, 0, 0));
  assert.equal(getUtcOffsetString('Europe/London', winterDate), 'UTC+0'); // GMT
});
