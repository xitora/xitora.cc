// unitConverter.ts 단위 테스트
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  convertUnit,
  formatUnitNumber,
  UNIT_SAMPLE_PRESETS,
} from '../src/utils/unitConverter.ts';

test('convertUnit: 길이 단위 변환 (m -> km, in -> cm)', () => {
  const km = convertUnit(1000, 'm', 'km', 'length');
  assert.equal(km, 1);

  const cm = convertUnit(1, 'in', 'cm', 'length');
  assert.equal(Number(cm.toFixed(2)), 2.54);
});

test('convertUnit: 면적 단위 변환 (평 ↔ ㎡)', () => {
  // 1평은 약 3.305785㎡
  const m2 = convertUnit(1, 'pyeong', 'm2', 'area');
  assert.equal(Number(m2.toFixed(2)), 3.31);

  // 84㎡는 약 25.4평
  const pyeong = convertUnit(84, 'm2', 'pyeong', 'area');
  assert.equal(Number(pyeong.toFixed(1)), 25.4);
});

test('convertUnit: 무게 단위 변환 (1근 = 600g, 1lb = 약 453.6g)', () => {
  const g = convertUnit(1, 'geun', 'g', 'weight');
  assert.equal(g, 600);

  const lbG = convertUnit(1, 'lb', 'g', 'weight');
  assert.equal(Number(lbG.toFixed(1)), 453.6);
});


test('UNIT_SAMPLE_PRESETS: 모든 프리셋 유효성 검증', () => {
  for (const preset of UNIT_SAMPLE_PRESETS) {
    if (preset.category === 'currency') {
      const res = convertCurrency(preset.value, preset.fromUnit, preset.toUnit);
      assert.ok(res > 0);
    } else {
      const res = convertUnit(preset.value, preset.fromUnit, preset.toUnit, preset.category);
      assert.ok(res > 0);
    }
  }
});
