// svgPath.ts 단위 테스트
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseSvgPath,
  SVG_PATH_PRESETS,
} from '../src/utils/svgPath.ts';

test('parseSvgPath: 직선 및 MoveTo(M, L, Z) 파싱 검증', () => {
  const d = 'M 10 20 L 50 60 Z';
  const res = parseSvgPath(d);

  assert.equal(res.isValid, true);
  assert.equal(res.segments.length, 3);
  assert.equal(res.segments[0].command, 'M');
  assert.equal(res.segments[0].endPoint.x, 10);
  assert.equal(res.segments[0].endPoint.y, 20);

  assert.equal(res.segments[1].command, 'L');
  assert.equal(res.segments[1].endPoint.x, 50);
  assert.equal(res.segments[1].endPoint.y, 60);

  assert.equal(res.segments[2].command, 'Z');
  assert.equal(res.segments[2].endPoint.x, 10);
  assert.equal(res.segments[2].endPoint.y, 20);
});

test('parseSvgPath: 3차 베지어 곡선(C) 제어점(CP1, CP2) 추출 검증', () => {
  const d = 'M 0 0 C 10 20 30 40 50 60';
  const res = parseSvgPath(d);

  assert.equal(res.isValid, true);
  assert.equal(res.bezierCount, 1);
  const bezierSeg = res.segments[1];
  assert.equal(bezierSeg.command, 'C');
  assert.equal(bezierSeg.controlPoints.length, 2);
  assert.equal(bezierSeg.controlPoints[0].x, 10);
  assert.equal(bezierSeg.controlPoints[0].y, 20);
  assert.equal(bezierSeg.controlPoints[1].x, 30);
  assert.equal(bezierSeg.controlPoints[1].y, 40);
  assert.equal(bezierSeg.endPoint.x, 50);
  assert.equal(bezierSeg.endPoint.y, 60);
});

test('parseSvgPath: 상대좌표(소문자) 연산 검증', () => {
  const d = 'M 10 10 l 20 30';
  const res = parseSvgPath(d);

  assert.equal(res.isValid, true);
  assert.equal(res.segments[1].command, 'l');
  assert.equal(res.segments[1].isRelative, true);
  assert.equal(res.segments[1].endPoint.x, 30); // 10 + 20
  assert.equal(res.segments[1].endPoint.y, 40); // 10 + 30
});

test('parseSvgPath: 바운딩 박스 계산 검증', () => {
  const d = 'M 0 0 L 100 200';
  const res = parseSvgPath(d);

  assert.equal(res.isValid, true);
  assert.equal(res.boundingBox.minX <= 0, true);
  assert.equal(res.boundingBox.maxX >= 100, true);
  assert.equal(res.boundingBox.minY <= 0, true);
  assert.equal(res.boundingBox.maxY >= 200, true);
});

test('SVG_PATH_PRESETS: 모든 프리셋 유효성 검증', () => {
  assert.equal(SVG_PATH_PRESETS.length >= 4, true);
  SVG_PATH_PRESETS.forEach((preset) => {
    const res = parseSvgPath(preset.d);
    assert.equal(res.isValid, true);
    assert.equal(res.segments.length > 0, true);
  });
});
