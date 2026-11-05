import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatBytes,
  calculateAspectRatioFit,
} from '../src/utils/imageOptimizer.ts';

test('formatBytes: 다양한 바이트 단위의 정확한 문자열 변환', () => {
  assert.equal(formatBytes(0), '0 B');
  assert.equal(formatBytes(512), '512 B');
  assert.equal(formatBytes(1024), '1 KB');
  assert.equal(formatBytes(1536), '1.5 KB');
  assert.equal(formatBytes(1048576), '1 MB');
  assert.equal(formatBytes(2621440), '2.5 MB');
  assert.equal(formatBytes(1073741824), '1 GB');
});

test('formatBytes: 비정상적인 입력값(음수, NaN)에 대한 방어 로직', () => {
  assert.equal(formatBytes(-100), '0 B');
  assert.equal(formatBytes(NaN), '0 B');
});

test('calculateAspectRatioFit: 가로가 더 긴 이미지의 비율 유지 리사이즈', () => {
  const result = calculateAspectRatioFit(1920, 1080, 1280, 720);
  assert.equal(result.width, 1280);
  assert.equal(result.height, 720);
});

test('calculateAspectRatioFit: 세로가 더 긴 이미지의 비율 유지 리사이즈', () => {
  const result = calculateAspectRatioFit(1000, 2000, 800, 800);
  assert.equal(result.width, 400);
  assert.equal(result.height, 800);
});

test('calculateAspectRatioFit: 이미 원본이 목표 크기보다 작을 경우 확대 방지', () => {
  const result = calculateAspectRatioFit(500, 300, 1000, 1000);
  assert.equal(result.width, 500);
  assert.equal(result.height, 300);
});
