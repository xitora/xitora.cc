// favicon.ts 단위 테스트
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateCrc32,
  createZipBundle,
  createIcoFromPngs,
  generateHtmlSnippet,
  generateWebManifestJson,
  ICON_DIMENSIONS,
} from '../src/utils/favicon.ts';

test('calculateCrc32: 표준 테스트 벡터 검증', () => {
  const encoder = new TextEncoder();
  const testBytes = encoder.encode('123456789');
  const crc = calculateCrc32(testBytes);

  // '123456789'의 표준 CRC-32는 0xcbf43926 (3421780262)
  assert.equal(crc, 0xcbf43926);
});

test('createZipBundle: ZIP 시그니처 및 엔트리 생성 검증', () => {
  const files = [
    { name: 'hello.txt', data: 'Hello World!' },
    { name: 'data.json', data: '{"status": "ok"}' },
  ];

  const zip = createZipBundle(files);

  assert.equal(zip.length > 50, true);
  // ZIP 파일 시작 시그니처: PK\x03\x04 (0x50, 0x4b, 0x03, 0x04)
  assert.equal(zip[0], 0x50);
  assert.equal(zip[1], 0x4b);
  assert.equal(zip[2], 0x03);
  assert.equal(zip[3], 0x04);
});

test('createIcoFromPngs: ICO 시그니처 및 디렉터리 헤더 검증', () => {
  const dummyPng1 = new Uint8Array([1, 2, 3, 4]);
  const dummyPng2 = new Uint8Array([5, 6, 7, 8]);

  const ico = createIcoFromPngs([
    { width: 16, height: 16, data: dummyPng1 },
    { width: 32, height: 32, data: dummyPng2 },
  ]);

  assert.equal(ico.length, 6 + 16 * 2 + 8);
  // ICO 매직 넘버: 0x00 0x00 0x01 0x00
  assert.equal(ico[0], 0x00);
  assert.equal(ico[1], 0x00);
  assert.equal(ico[2], 0x01);
  assert.equal(ico[3], 0x00);
  // 이미지 개수: 2
  assert.equal(ico[4], 0x02);
  assert.equal(ico[5], 0x00);
});

test('generateHtmlSnippet & manifest: 필수 태그와 JSON 파싱 검증', () => {
  const snippet = generateHtmlSnippet('테스트 앱');
  assert.equal(snippet.includes('favicon.ico'), true);
  assert.equal(snippet.includes('apple-touch-icon.png'), true);
  assert.equal(snippet.includes('site.webmanifest'), true);

  const manifest = generateWebManifestJson('테스트 앱');
  const parsed = JSON.parse(manifest);
  assert.equal(parsed.name, '테스트 앱');
  assert.equal(Array.isArray(parsed.icons), true);
  assert.equal(parsed.icons.length, 2);
});

test('ICON_DIMENSIONS: 규격 목록 검증', () => {
  assert.equal(ICON_DIMENSIONS.length, 6);
  assert.equal(ICON_DIMENSIONS.some((d) => d.size === 16), true);
  assert.equal(ICON_DIMENSIONS.some((d) => d.size === 512), true);
});
