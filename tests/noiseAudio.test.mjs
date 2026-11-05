// noiseAudio.ts 단위 테스트
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  INITIAL_TRACKS,
  NOISE_PRESETS,
} from '../src/utils/noiseAudio.ts';

test('INITIAL_TRACKS: 기본 트랙 구성 및 볼륨 범위 검증', () => {
  assert.equal(INITIAL_TRACKS.length, 6);
  INITIAL_TRACKS.forEach((track) => {
    assert.ok(track.volume >= 0 && track.volume <= 1);
    assert.ok(track.name.length > 0);
  });
});

test('NOISE_PRESETS: 프리셋 유효성 검증', () => {
  assert.ok(NOISE_PRESETS.length >= 4);
  NOISE_PRESETS.forEach((preset) => {
    assert.ok(preset.title.length > 0);
    const keys = Object.keys(preset.activeTracks);
    assert.ok(keys.length > 0);
  });
});
