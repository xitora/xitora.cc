// easing.ts 단위 테스트
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateCubicBezier,
  formatCubicBezier,
  generateCssTransition,
  generateTailwindClass,
  generateFramerMotionSnippet,
  generateWaapiSnippet,
  EASING_PRESETS,
} from '../src/utils/easing.ts';

test('formatCubicBezier: cubic-bezier CSS 함수 문자열 포맷팅 검증', () => {
  const formatted = formatCubicBezier(0.25, 0.1, 0.25, 1.0);
  assert.equal(formatted, 'cubic-bezier(0.25, 0.1, 0.25, 1)');
});

test('evaluateCubicBezier: Linear(등속) t=0, t=0.5, t=1 검증', () => {
  const y0 = evaluateCubicBezier(0, 0, 0, 1, 1);
  const yHalf = evaluateCubicBezier(0.5, 0, 0, 1, 1);
  const y1 = evaluateCubicBezier(1, 0, 0, 1, 1);

  assert.equal(y0, 0);
  assert.equal(Math.abs(yHalf - 0.5) < 0.01, true);
  assert.equal(y1, 1);
});

test('evaluateCubicBezier: Overshoot/Spring 값이 1.0을 초과하는지 검증', () => {
  // P1=(0.34, 1.56), P2=(0.64, 1.0)
  const yMax = evaluateCubicBezier(0.7, 0.34, 1.56, 0.64, 1.0);
  assert.equal(yMax > 1.0, true);
});

test('generateCssTransition & generateTailwindClass 스니펫 검증', () => {
  const css = generateCssTransition(0.6, 0.42, 0, 0.58, 1);
  assert.equal(css.includes('transition: all 0.6s cubic-bezier('), true);

  const tw = generateTailwindClass(0.42, 0, 0.58, 1);
  assert.equal(tw.startsWith('ease-[cubic-bezier('), true);
  assert.equal(tw.includes('duration-500'), true);
});

test('generateFramerMotionSnippet & WAAPI 스니펫 검증', () => {
  const framer = generateFramerMotionSnippet(0.8, 0.16, 1, 0.3, 1);
  assert.equal(framer.includes('ease: [0.16, 1, 0.3, 1]'), true);
  assert.equal(framer.includes('duration: 0.8'), true);

  const waapi = generateWaapiSnippet(0.5, 0.25, 0.1, 0.25, 1);
  assert.equal(waapi.includes('duration: 500'), true);
  assert.equal(waapi.includes('easing:'), true);
});

test('EASING_PRESETS: 프리셋 유효성 검증', () => {
  assert.equal(EASING_PRESETS.length >= 8, true);
  EASING_PRESETS.forEach((preset) => {
    assert.equal(preset.p1.x >= 0 && preset.p1.x <= 1, true);
    assert.equal(preset.p2.x >= 0 && preset.p2.x <= 1, true);
  });
});
