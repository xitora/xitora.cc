import test from "node:test";
import assert from "node:assert/strict";
import {
  hexToRgb,
  rgbToHex,
  rgbToHsl,
  hslToRgb,
  getWcagRating,
  generateHarmonies,
  extractPaletteFromImageData,
  generateInfinite5Palette
} from "../src/utils/colorPalette.ts";

test("hexToRgb & rgbToHex: 양방향 색상 변환 검증", () => {
  const rgb = hexToRgb("#38bdf8");
  assert.ok(rgb);
  assert.equal(rgb.r, 56);
  assert.equal(rgb.g, 189);
  assert.equal(rgb.b, 248);

  const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
  assert.equal(hex.toLowerCase(), "#38bdf8");

  // 3자리 단축 hex 파싱 검증
  const shortRgb = hexToRgb("#fff");
  assert.ok(shortRgb);
  assert.equal(shortRgb.r, 255);
  assert.equal(shortRgb.g, 255);
  assert.equal(shortRgb.b, 255);

  // 비정상 hex 입력 방어
  assert.equal(hexToRgb("invalid"), null);
});

test("rgbToHsl & hslToRgb: HSL 색 공간 변환 검증", () => {
  // 순수 빨강 (H: 0, S: 100%, L: 50%)
  const redHsl = rgbToHsl(255, 0, 0);
  assert.equal(redHsl.h, 0);
  assert.equal(redHsl.s, 100);
  assert.equal(redHsl.l, 50);

  const redRgb = hslToRgb(0, 100, 50);
  assert.equal(redRgb.r, 255);
  assert.equal(redRgb.g, 0);
  assert.equal(redRgb.b, 0);
});

test("getWcagRating: WCAG 2.1 접근성 명도 대비 계산 검증", () => {
  const blackAndWhite = getWcagRating("#000000", "#ffffff");
  assert.equal(blackAndWhite.ratio, 21);
  assert.equal(blackAndWhite.aaNormal, true);
  assert.equal(blackAndWhite.aaaNormal, true);

  const lowContrast = getWcagRating("#38bdf8", "#45c5ff");
  assert.ok(lowContrast.ratio < 2.0);
  assert.equal(lowContrast.aaNormal, false);
});

test("generateHarmonies: 조화 팔레트 생성 알고리즘 검증", () => {
  const harmonies = generateHarmonies("#38bdf8");
  assert.equal(harmonies.complementary.length, 2);
  assert.equal(harmonies.analogous.length, 3);
  assert.equal(harmonies.triadic.length, 3);
  assert.equal(harmonies.tetradic.length, 4);
  assert.equal(harmonies.monochromatic.length, 5);
});

test("extractPaletteFromImageData: 이미지 픽셀 양자화 팔레트 추출 검증", () => {
  // 4x4 크기의 단색 픽셀 버퍼 (RGBA)
  const buffer = new Uint8ClampedArray(4 * 4 * 4);
  for (let i = 0; i < buffer.length; i += 4) {
    buffer[i] = 255;   // R
    buffer[i + 1] = 0; // G
    buffer[i + 2] = 0; // B
    buffer[i + 3] = 255; // A
  }

  const palette = extractPaletteFromImageData(buffer, 3);
  assert.ok(palette.length > 0);
  assert.ok(palette[0].hex.startsWith("#"));
  assert.equal(palette[0].rgb.r, 255);
});

test("generateInfinite5Palette: 5색 팔레트 무한 생성 및 잠금/무드 옵션 검증", () => {
  // 1. 기본 생성 검증: 항상 5개의 유효한 Hex 문자열 반환
  const res1 = generateInfinite5Palette([null, null, null, null, null], "all");
  assert.equal(res1.colors.length, 5);
  for (const c of res1.colors) {
    assert.match(c, /^#[0-9a-f]{6}$/i);
  }

  // 2. 잠금 슬롯 보존 검증: 특정 슬롯에 잠긴 색상이 유지되는지 확인
  const locked = ["#ff0000", null, "#00ff00", null, null];
  const res2 = generateInfinite5Palette(locked, "warm");
  assert.equal(res2.colors[0].toLowerCase(), "#ff0000");
  assert.equal(res2.colors[2].toLowerCase(), "#00ff00");
  assert.equal(res2.mood, "warm");

  // 3. 무드별 생성 검증 (모든 무드 옵션)
  const moods = ["balanced", "warm", "cool", "pastel", "vivid", "neon"];
  for (const m of moods) {
    const resM = generateInfinite5Palette([null, null, null, null, null], m);
    assert.equal(resM.mood, m);
    assert.equal(resM.colors.length, 5);
  }

  // 4. 반복 호출 시 다양성 검증 (정해진 값이 아닌 무작위 생성)
  const setA = generateInfinite5Palette().colors.join(",");
  let isDifferentFound = false;
  for (let i = 0; i < 5; i++) {
    const setB = generateInfinite5Palette().colors.join(",");
    if (setA !== setB) {
      isDifferentFound = true;
      break;
    }
  }
  assert.equal(isDifferentFound, true);

  // 5. 무드별 색채 특성 정밀 검증
  // 5-1. warm (따스한 웜톤): 대부분의 색상이 웜톤 스펙트럼(레드, 오렌지, 앰버, 골드, 웜베이지)에 분포해야 함
  for (let i = 0; i < 10; i++) {
    const warmPalette = generateInfinite5Palette([null, null, null, null, null], "warm");
    const warmHsls = warmPalette.colors.map((c) => {
      const rgb = hexToRgb(c);
      return rgbToHsl(rgb.r, rgb.g, rgb.b);
    });
    const warmColors = warmHsls.filter((x) => x.h <= 85 || x.h >= 330);
    // 5개 중 최소 3개 이상이 웜톤 계열이어야 함
    assert.ok(warmColors.length >= 3, `Warm palette should contain at least 3 warm colors (found ${warmColors.length})`);
  }

  // 5-2. cool (시원한 쿨톤): 대부분의 색상이 쿨톤 스펙트럼(시안, 민트, 블루, 인디고)에 분포해야 함
  for (let i = 0; i < 10; i++) {
    const coolPalette = generateInfinite5Palette([null, null, null, null, null], "cool");
    const coolHsls = coolPalette.colors.map((c) => {
      const rgb = hexToRgb(c);
      return rgbToHsl(rgb.r, rgb.g, rgb.b);
    });
    const coolColors = coolHsls.filter((x) => x.h >= 140 && x.h <= 290);
    assert.ok(coolColors.length >= 3, `Cool palette should contain at least 3 cool colors (found ${coolColors.length})`);
  }

  // 5-3. pastel (부드러운 파스텔): 모든 색상이 화사하고 부드러운 고명도(L >= 60)여야 함
  for (let i = 0; i < 10; i++) {
    const pastelPalette = generateInfinite5Palette([null, null, null, null, null], "pastel");
    const pastelHsls = pastelPalette.colors.map((c) => {
      const rgb = hexToRgb(c);
      return rgbToHsl(rgb.r, rgb.g, rgb.b);
    });
    const allBright = pastelHsls.every((x) => x.l >= 60);
    assert.ok(allBright, "Pastel palette colors must have lightness >= 60%");
  }

  // 5-4. vivid (비비드 & 팝): 평균 채도가 70% 이상으로 선명해야 함
  for (let i = 0; i < 10; i++) {
    const vividPalette = generateInfinite5Palette([null, null, null, null, null], "vivid");
    const vividHsls = vividPalette.colors.map((c) => {
      const rgb = hexToRgb(c);
      return rgbToHsl(rgb.r, rgb.g, rgb.b);
    });
    const avgS = vividHsls.reduce((a, b) => a + b.s, 0) / 5;
    assert.ok(avgS >= 70, `Vivid palette average saturation must be >= 70% (was ${avgS})`);
  }
});

