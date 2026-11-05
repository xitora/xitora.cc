/**
 * 색상 변환, 조화 팔레트 생성, WCAG 접근성 검사 및 이미지 색상 추출 유틸리티
 */
import { COLOURLOVERS_PALETTES } from "../data/colourLoversPalettes.ts";

export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export interface HslColor {
  h: number; // 0 ~ 360
  s: number; // 0 ~ 100 (%)
  l: number; // 0 ~ 100 (%)
}

export interface ColorItem {
  hex: string;
  rgb: RgbColor;
  hsl: HslColor;
  population?: number; // 픽셀 빈도
}

export interface WcagRating {
  ratio: number;
  aaNormal: boolean; // >= 4.5
  aaLarge: boolean;  // >= 3.0
  aaaNormal: boolean; // >= 7.0
  aaaLarge: boolean;  // >= 4.5
}

/**
 * 16진수(Hex) 문자열을 RGB 객체로 변환합니다.
 */
export function hexToRgb(hex: string): RgbColor | null {
  try {
    let clean = hex.replace("#", "").trim();
    if (clean.length === 3) {
      clean = clean.split("").map((c) => c + c).join("");
    }
    if (clean.length !== 6) return null;

    const num = parseInt(clean, 16);
    if (isNaN(num)) return null;

    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255
    };
  } catch {
    return null;
  }
}

/**
 * RGB 값을 16진수(Hex) 문자열로 변환합니다.
 */
export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const toHex = (v: number) => clamp(v).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * RGB 값을 HSL 객체로 변환합니다.
 */
export function rgbToHsl(r: number, g: number, b: number): HslColor {
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;

  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rNorm:
        h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0);
        break;
      case gNorm:
        h = (bNorm - rNorm) / d + 2;
        break;
      case bNorm:
        h = (rNorm - gNorm) / d + 4;
        break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
}

/**
 * HSL 값을 RGB 객체로 변환합니다.
 */
export function hslToRgb(h: number, s: number, l: number): RgbColor {
  const hNorm = ((h % 360) + 360) % 360 / 360;
  const sNorm = Math.max(0, Math.min(100, s)) / 100;
  const lNorm = Math.max(0, Math.min(100, l)) / 100;

  if (sNorm === 0) {
    const val = Math.round(lNorm * 255);
    return { r: val, g: val, b: val };
  }

  const hue2rgb = (p: number, q: number, t: number) => {
    let tNorm = t;
    if (tNorm < 0) tNorm += 1;
    if (tNorm > 1) tNorm -= 1;
    if (tNorm < 1 / 6) return p + (q - p) * 6 * tNorm;
    if (tNorm < 1 / 2) return q;
    if (tNorm < 2 / 3) return p + (q - p) * (2 / 3 - tNorm) * 6;
    return p;
  };

  const q = lNorm < 0.5 ? lNorm * (1 + sNorm) : lNorm + sNorm - lNorm * sNorm;
  const p = 2 * lNorm - q;

  const r = Math.round(hue2rgb(p, q, hNorm + 1 / 3) * 255);
  const g = Math.round(hue2rgb(p, q, hNorm) * 255);
  const b = Math.round(hue2rgb(p, q, hNorm - 1 / 3) * 255);

  return { r, g, b };
}

/**
 * HSL 값을 Hex 문자열로 변환합니다.
 */
export function hslToHex(h: number, s: number, l: number): string {
  const rgb = hslToRgb(h, s, l);
  return rgbToHex(rgb.r, rgb.g, rgb.b);
}

/**
 * 상대 휘도(Relative Luminance)를 계산합니다.
 */
export function getLuminance(r: number, g: number, b: number): number {
  const a = [r, g, b].map((v) => {
    const norm = v / 255;
    return norm <= 0.03928 ? norm / 12.92 : Math.pow((norm + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

/**
 * 두 색상 간의 WCAG 명도 대비 및 등급을 판정합니다.
 */
export function getWcagRating(hex1: string, hex2: string): WcagRating {
  const rgb1 = hexToRgb(hex1) || { r: 0, g: 0, b: 0 };
  const rgb2 = hexToRgb(hex2) || { r: 255, g: 255, b: 255 };

  const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  const rawRatio = (lighter + 0.05) / (darker + 0.05);
  const ratio = Number(rawRatio.toFixed(2));

  return {
    ratio,
    aaNormal: rawRatio >= 4.5,
    aaLarge: rawRatio >= 3.0,
    aaaNormal: rawRatio >= 7.0,
    aaaLarge: rawRatio >= 4.5
  };
}

/**
 * 기준 색상에 따른 5가지 색채 조화(Harmony) 팔레트를 생성합니다.
 */
export function generateHarmonies(hex: string): {
  complementary: string[];
  analogous: string[];
  triadic: string[];
  tetradic: string[];
  monochromatic: string[];
} {
  const rgb = hexToRgb(hex) || { r: 56, g: 189, b: 248 };
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);

  const rotateH = (deg: number) => (hsl.h + deg + 360) % 360;

  // 1. 보색 (Complementary): 180도 대칭
  const complementary = [
    hex,
    hslToHex(rotateH(180), hsl.s, hsl.l)
  ];

  // 2. 유사색 (Analogous): ±30도
  const analogous = [
    hslToHex(rotateH(-30), hsl.s, hsl.l),
    hex,
    hslToHex(rotateH(30), hsl.s, hsl.l)
  ];

  // 3. 삼색조 (Triadic): 120도 간격 3색
  const triadic = [
    hex,
    hslToHex(rotateH(120), hsl.s, hsl.l),
    hslToHex(rotateH(240), hsl.s, hsl.l)
  ];

  // 4. 사색조 (Tetradic): 90도 간격 4색
  const tetradic = [
    hex,
    hslToHex(rotateH(90), hsl.s, hsl.l),
    hslToHex(rotateH(180), hsl.s, hsl.l),
    hslToHex(rotateH(270), hsl.s, hsl.l)
  ];

  // 5. 단색조 (Monochromatic): 동일 색상환에서 명도 변화 5단계
  const monochromatic = [
    hslToHex(hsl.h, hsl.s, 85),
    hslToHex(hsl.h, hsl.s, 65),
    hex,
    hslToHex(hsl.h, hsl.s, 35),
    hslToHex(hsl.h, hsl.s, 18)
  ];

  return {
    complementary,
    analogous,
    triadic,
    tetradic,
    monochromatic
  };
}

/**
/**
 * 캔버스 ImageData에서 고품질 대표 색상들을 추출하는 정밀 컬러 퀀타이제이션 및 가중치 추출 알고리즘
 */
export function extractPaletteFromImageData(
  data: Uint8ClampedArray,
  maxColors = 6
): ColorItem[] {
  try {
    const colorMap = new Map<string, { sumR: number; sumG: number; sumB: number; count: number; weight: number }>();
    const step = 4 * 4; // 4픽셀 간격 정밀 샘플링

    for (let i = 0; i < data.length; i += step) {
      const a = data[i + 3];
      if (a < 128) continue; // 투명 픽셀 제외

      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // 12단위 세분화 양자화 버킷 키
      const qr = Math.min(255, Math.round(r / 12) * 12);
      const qg = Math.min(255, Math.round(g / 12) * 12);
      const qb = Math.min(255, Math.round(b / 12) * 12);
      const key = `${qr},${qg},${qb}`;

      const hsl = rgbToHsl(r, g, b);
      // 극단적인 흑백(순백/순흑) 대신 채도와 대비가 적절한 색상에 가중치 부여
      const saturationBonus = hsl.s > 15 ? 1.0 + (hsl.s / 100) * 1.5 : 0.6;
      const lightnessPenalty = hsl.l < 6 || hsl.l > 94 ? 0.3 : 1.0;
      const scoreWeight = saturationBonus * lightnessPenalty;

      const existing = colorMap.get(key);
      if (existing) {
        existing.count++;
        existing.sumR += r;
        existing.sumG += g;
        existing.sumB += b;
        existing.weight += scoreWeight;
      } else {
        colorMap.set(key, { sumR: r, sumG: g, sumB: b, count: 1, weight: scoreWeight });
      }
    }

    // 버킷 내 실제 픽셀 평균값 계산 후 가중치 순으로 정렬
    const sorted = Array.from(colorMap.values())
      .map((item) => ({
        r: Math.round(item.sumR / item.count),
        g: Math.round(item.sumG / item.count),
        b: Math.round(item.sumB / item.count),
        count: item.count,
        weight: item.weight
      }))
      .sort((a, b) => b.weight - a.weight)
      .slice(0, maxColors * 3);

    // 서로 구별되는 색상 선별 (유클리드 색차 거리 28 이상)
    const results: ColorItem[] = [];
    for (const c of sorted) {
      const isTooClose = results.some((selected) => {
        const dr = selected.rgb.r - c.r;
        const dg = selected.rgb.g - c.g;
        const db = selected.rgb.b - c.b;
        return Math.sqrt(dr * dr + dg * dg + db * db) < 28;
      });

      if (!isTooClose) {
        const hex = rgbToHex(c.r, c.g, c.b);
        const rgb = { r: c.r, g: c.g, b: c.b };
        const hsl = rgbToHsl(c.r, c.g, c.b);
        results.push({ hex, rgb, hsl, population: c.count });
        if (results.length >= maxColors) break;
      }
    }

    // 결과가 부족할 경우 기본 색상 보충
    if (results.length === 0) {
      const defaultHex = "#014AFF";
      const rgb = hexToRgb(defaultHex)!;
      results.push({ hex: defaultHex, rgb, hsl: rgbToHsl(rgb.r, rgb.g, rgb.b) });
    }

    return results;
  } catch (error) {
    console.error("색상 추출 중 오류:", error);
    return [
      { hex: "#014AFF", rgb: { r: 1, g: 74, b: 255 }, hsl: { h: 223, s: 100, l: 50 } }
    ];
  }
}

/**
 * 자연에서 영감을 받은 아름다운 5가지 색상 프리셋 컬렉션
 */
export interface NaturePalette {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  colors: [string, string, string, string, string];
}

export const NATURE_PALETTES: NaturePalette[] = [
  {
    id: "deep-forest",
    name: "깊은 상록수림",
    nameEn: "Deep Evergreen Forest",
    description: "새벽녘 울창한 침엽수림의 차분하고 깊은 녹음",
    colors: ["#0F2018", "#1E3F30", "#3E6B48", "#88A878", "#E3ECE2"]
  },
  {
    id: "sunset-glow",
    name: "노을빛 지평선",
    nameEn: "Sunset Horizon",
    description: "해가 질 무렵 보랏빛 하늘과 붉은 태양이 빚어내는 황혼",
    colors: ["#2B1055", "#6B2B5C", "#B83B5E", "#F08A5D", "#FEE440"]
  },
  {
    id: "ocean-breeze",
    name: "지중해 바다와 해안",
    nameEn: "Mediterranean Ocean",
    description: "에메랄드빛 파도와 모래사장이 어우러진 시원한 바다",
    colors: ["#051923", "#003554", "#006494", "#0582CA", "#BEE9E8"]
  },
  {
    id: "desert-sand",
    name: "따스한 사막의 모래언덕",
    nameEn: "Warm Desert Dunes",
    description: "햇살을 머금은 사막의 부드러운 어스 톤(Earth tone)",
    colors: ["#3D2C29", "#7D5334", "#C48B5D", "#DFBE99", "#F7EFE8"]
  },
  {
    id: "nordic-morning",
    name: "북유럽의 고요한 새벽",
    nameEn: "Nordic Morning",
    description: "새벽 안개와 눈 덮인 호수의 차분한 블루 그레이 톤",
    colors: ["#1A2238", "#2E3A59", "#536B88", "#8FA4BC", "#EDF2F7"]
  },
  {
    id: "spring-cherry",
    name: "봄날의 벚꽃길",
    nameEn: "Spring Cherry Blossom",
    description: "봄바람에 흩날리는 벚꽃잎의 화사하고 산뜻한 핑크 팔레트",
    colors: ["#3D1324", "#7B2848", "#B84A6E", "#E892A8", "#FDEFF3"]
  },
  {
    id: "autumn-maple",
    name: "단풍 물든 가을 숲",
    nameEn: "Autumn Maple Woods",
    description: "붉고 노랗게 물든 단풍과 낙엽의 풍성한 계절감",
    colors: ["#3A170F", "#782817", "#B64522", "#E27B58", "#F6D268"]
  },
  {
    id: "lavender-mist",
    name: "보랏빛 라벤더 들판",
    nameEn: "Lavender Mist",
    description: "은은한 향기를 품은 남프랑스 라벤더 농장의 부드러운 보라",
    colors: ["#231934", "#483863", "#745E94", "#A896C3", "#EDE7F6"]
  },
  {
    id: "warm-wood-cafe",
    name: "아늑한 원목 카페",
    nameEn: "Cozy Wood Cafe",
    description: "짙은 에스프레소와 편안한 원목 인테리어의 따스함",
    colors: ["#26190F", "#483222", "#77583F", "#B49479", "#EAE0D5"]
  },
  {
    id: "fresh-matcha",
    name: "청량한 녹차와 말차",
    nameEn: "Fresh Green Matcha",
    description: "싱그러운 녹차 찻잎의 신선함과 정갈한 힐링 그린",
    colors: ["#162816", "#2D4B2D", "#537843", "#86AB5B", "#DCE9C7"]
  }
];

/**
 * 사전 제공 추천 테마 팔레트 프리셋
 */
export const PRESET_THEMES = [
  {
    name: "사이버 네온",
    colors: ["#0f172a", "#38bdf8", "#818cf8", "#c084fc", "#f43f5e"]
  },
  {
    name: "자연 포레스트",
    colors: ["#14532d", "#16a34a", "#4ade80", "#fef08a", "#78350f"]
  },
  {
    name: "선셋 그라디언트",
    colors: ["#4c0519", "#9f1239", "#f43f5e", "#fb923c", "#fde047"]
  },
  {
    name: "모던 미니멀",
    colors: ["#18181b", "#3f3f46", "#71717a", "#d4d4d8", "#f4f4f5"]
  },
  {
    name: "파스텔 드림",
    colors: ["#fbcfe8", "#e9d5ff", "#c7d2fe", "#bae6fd", "#bbf7d0"]
  }
];

export type PaletteMood = "all" | "balanced" | "warm" | "cool" | "pastel" | "vivid" | "neon";

export const PALETTE_MOOD_OPTIONS: { id: PaletteMood; label: string; desc: string }[] = [
  { id: "all", label: "전체 스타일", desc: "모든 스타일을 아우르는 균형 있는 배색" },
  { id: "balanced", label: "조화로운 밸런스", desc: "명도와 채도가 균형 잡힌 다목적 배색" },
  { id: "warm", label: "따스한 웜톤 & 카페", desc: "노을, 테라코타, 에스프레소, 골든 앰버 톤" },
  { id: "cool", label: "시원한 쿨톤 & 오션", desc: "청록 민트, 지중해 바다, 인디고 톤" },
  { id: "pastel", label: "부드러운 파스텔", desc: "밀크티, 블러쉬, 크림, 은은한 세이지 톤" },
  { id: "vivid", label: "비비드 & 팝", desc: "생동감 있는 포인트 컬러 대비" },
  { id: "neon", label: "딥 다크 & 네온", desc: "딥 다크 베이스와 네온 포인트의 대비" }
];

export interface InfinitePaletteResult {
  colors: [string, string, string, string, string];
  mood: PaletteMood;
  moodLabel: string;
}

/**
 * 5색 팔레트의 HSL 특성을 기반으로 무드를 판정합니다.
 */
function determinePaletteMood(colors: readonly string[]): PaletteMood {
  try {
    const hsls = colors.map((c) => {
      const rgb = hexToRgb(c) || { r: 128, g: 128, b: 128 };
      return rgbToHsl(rgb.r, rgb.g, rgb.b);
    });
    const avgS = hsls.reduce((a, b) => a + b.s, 0) / 5;
    const avgL = hsls.reduce((a, b) => a + b.l, 0) / 5;
    const minL = Math.min(...hsls.map((x) => x.l));
    const maxL = Math.max(...hsls.map((x) => x.l));

    // 유의미한 채도(s >= 14)를 가진 웜/쿨 색상 판별
    // 웜톤: 레드, 오렌지, 앰버, 골든 옐로우, 테라코타, 에스프레소 (345°~360° 및 0°~65°)
    const warmCount = hsls.filter((x) => (x.h >= 345 || x.h <= 65) && x.s >= 14).length;
    // 쿨톤: 시안, 민트, 스카이블루, 오션, 인디고, 딥네이비 (155°~270°)
    const coolCount = hsls.filter((x) => x.h >= 155 && x.h <= 270 && x.s >= 14).length;

    // 1. 딥 다크 & 네온: 딥 다크 베이스(minL <= 22) + 초고채도 일렉트릭 포인트(s >= 75 && l >= 45 && l <= 72)
    const hasDeepDark = hsls.some((x) => x.l <= 22);
    const hasElectricBright = hsls.some((x) => x.s >= 75 && x.l >= 45 && x.l <= 72);
    if (hasDeepDark && hasElectricBright && avgS >= 50) return "neon";

    // 2. 부드러운 파스텔: 딥 다크 색상이 없고(minL >= 48) 전체적으로 화사하며(avgL >= 68) 과도하게 쨍하지 않음(avgS <= 65)
    if (minL >= 48 && avgL >= 68 && avgS <= 65) return "pastel";

    // 3. 따스한 웜톤: 웜톤 색상이 지배적(3개 이상)이고 쿨톤 색상이 배제되거나 최소(<= 1)
    if (warmCount >= 3 && coolCount <= 1) return "warm";

    // 4. 시원한 쿨톤: 쿨톤 색상이 지배적(3개 이상)이고 웜톤 색상이 배제되거나 최소(<= 1)
    if (coolCount >= 3 && warmCount <= 1) return "cool";

    // 5. 비비드 & 팝: 채도가 매우 높고 생동감 넘치는 원색 대비
    if (avgS >= 68 && avgL >= 38 && avgL <= 74) return "vivid";

    return "balanced";
  } catch {
    return "balanced";
  }
}

// 모듈 로드 시 무드별 버킷 사전 분류 (약 990개 팔레트를 즉시 분류하여 초고속 검색 지원)
const MOOD_BUCKETS: Record<PaletteMood, (readonly [string, string, string, string, string])[]> = {
  all: [...COLOURLOVERS_PALETTES],
  balanced: [],
  warm: [],
  cool: [],
  pastel: [],
  vivid: [],
  neon: []
};

for (const p of COLOURLOVERS_PALETTES) {
  const m = determinePaletteMood(p);
  MOOD_BUCKETS[m].push(p);
}

/**
 * COLOURlovers의 감각적인 컬러 하모니 원리를 기반으로 5색 팔레트를 무한 생성합니다.
 * @param lockedColors 잠금된 색상 배열 (길이 5, 잠기지 않은 슬롯은 null)
 * @param selectedMood 희망하는 색채 무드 ('all'일 경우 랜덤 무드 자동 선택)
 */
export function generateInfinite5Palette(
  lockedColors: (string | null)[] = [null, null, null, null, null],
  selectedMood: PaletteMood = "all"
): InfinitePaletteResult {
  try {
    const availableMoods: PaletteMood[] = ["balanced", "warm", "cool", "pastel", "vivid", "neon"];
    const targetMood: PaletteMood =
      selectedMood === "all"
        ? availableMoods[Math.floor(Math.random() * availableMoods.length)]
        : selectedMood;

    const moodOption = PALETTE_MOOD_OPTIONS.find((m) => m.id === targetMood) || PALETTE_MOOD_OPTIONS[0];

    // 잠금 슬롯 검사
    const lockedIndices: number[] = [];
    lockedColors.forEach((c, idx) => {
      if (c && hexToRgb(c)) lockedIndices.push(idx);
    });

    // 5개 슬롯이 모두 잠긴 경우 그대로 반환
    if (lockedIndices.length === 5) {
      return {
        colors: lockedColors as [string, string, string, string, string],
        mood: targetMood,
        moodLabel: moodOption.label
      };
    }

    // 후보군 풀 선정 (요청된 무드 버킷에서 우선 선정, 비어있을 경우 전체 풀 사용)
    let candidatePool: readonly (readonly [string, string, string, string, string])[] = MOOD_BUCKETS[targetMood];
    if (!candidatePool || candidatePool.length === 0) {
      candidatePool = COLOURLOVERS_PALETTES;
    }

    let resultColors: string[] = [];

    if (lockedIndices.length === 0) {
      // 1. 잠긴 슬롯이 없는 경우: 템플릿의 조화를 기반으로 무드별 규칙 엄격 적용
      const baseTemplate = candidatePool[Math.floor(Math.random() * candidatePool.length)];

      // 무드별 회전 및 색조 제어
      let rotAngle = 0;
      if (targetMood === "warm") {
        // 웜톤: 360도 회전 금지, 원작 웜톤 배색 유지(70%) 또는 웜톤 내 미세 지터(±10도)
        rotAngle = Math.random() < 0.7 ? 0 : Math.floor(Math.random() * 21) - 10;
      } else if (targetMood === "cool") {
        // 쿨톤: 360도 회전 금지, 원작 쿨톤 배색 유지(70%) 또는 쿨톤 내 미세 지터(±12도)
        rotAngle = Math.random() < 0.7 ? 0 : Math.floor(Math.random() * 25) - 12;
      } else if (targetMood === "balanced") {
        // 밸런스: 50% 원작 유지, 50% 미세 회전
        rotAngle = Math.random() < 0.5 ? 0 : Math.floor(Math.random() * 360);
      } else {
        // 파스텔/비비드/네온: 색상환 회전 허용하되 명도/채도 보정
        rotAngle = Math.random() < 0.4 ? 0 : Math.floor(Math.random() * 360);
      }

      resultColors = baseTemplate.map((hex, idx) => {
        const rgb = hexToRgb(hex) || { r: 128, g: 128, b: 128 };
        const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
        let newH = (hsl.h + rotAngle + 360) % 360;
        let newS = hsl.s;
        let newL = hsl.l;

        // 무드별 정밀 색채 가공 (Anti-AI-slop & 정확한 심미성)
        if (targetMood === "warm") {
          // 쿨톤(110도~280도)으로 튀는 색상은 따스한 테라코타/오렌지/골든베이지로 매핑
          if (newH >= 110 && newH <= 280) {
            newH = (newH % 60) + (Math.random() < 0.5 ? 15 : 345);
          }
          newS = Math.max(20, Math.min(95, newS + (Math.floor(Math.random() * 5) - 2)));
          newL = Math.max(12, Math.min(90, newL + (Math.floor(Math.random() * 5) - 2)));
        } else if (targetMood === "cool") {
          // 웜톤(0도~65도, 335도~360도)으로 튀는 색상은 쿨 시안/오션/인디고(170~250도)로 매핑
          if (newH < 75 || newH > 325) {
            newH = 175 + Math.floor(Math.random() * 70);
          }
          newS = Math.max(20, Math.min(95, newS + (Math.floor(Math.random() * 5) - 2)));
          newL = Math.max(12, Math.min(92, newL + (Math.floor(Math.random() * 5) - 2)));
        } else if (targetMood === "pastel") {
          // 파스텔: 딥 다크 방지, 부드러운 중채도(25~62%) + 높은 화사한 명도(72~94%)
          newS = Math.max(25, Math.min(62, Math.round(newS * 0.85)));
          newL = Math.max(72, Math.min(94, Math.round(newL * 0.4 + 55)));
        } else if (targetMood === "vivid") {
          // 비비드: 생생한 고채도(78~100%) + 적정 명도(42~64%)
          newS = Math.max(78, Math.min(100, Math.round(newS * 1.25)));
          newL = Math.max(42, Math.min(64, newL));
        } else if (targetMood === "neon") {
          // 네온: 1번째 슬롯은 칠흑 같은 딥 다크 베이스, 나머지는 초고채도 일렉트릭 형광
          if (idx === 0) {
            newS = Math.min(40, newS);
            newL = Math.max(8, Math.min(16, newL));
          } else {
            newS = Math.max(88, Math.min(100, Math.round(newS * 1.3)));
            newL = Math.max(50, Math.min(65, newL));
          }
        }

        return hslToHex(newH, newS, newL);
      });
    } else {
      // 2. 1개 이상의 슬롯이 잠긴 경우: 잠긴 색상들과 어울리는 템플릿 탐색 후 무드 규칙 적용
      const firstLockedIdx = lockedIndices[0];
      const firstLockedHex = lockedColors[firstLockedIdx]!;
      const lockedRgb = hexToRgb(firstLockedHex) || { r: 56, g: 189, b: 248 };
      const lockedHsl = rgbToHsl(lockedRgb.r, lockedRgb.g, lockedRgb.b);

      let bestTemplate = candidatePool[0] || COLOURLOVERS_PALETTES[0];
      let bestSlot = 0;
      let minDiff = Infinity;

      const sampleCount = Math.min(candidatePool.length, 120);
      const startIdx = Math.floor(Math.random() * Math.max(1, candidatePool.length - sampleCount));

      for (let i = 0; i < sampleCount; i++) {
        const p = candidatePool[startIdx + i];
        for (let s = 0; s < 5; s++) {
          const rgb = hexToRgb(p[s]);
          if (!rgb) continue;
          const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
          const dH = Math.min(Math.abs(hsl.h - lockedHsl.h), 360 - Math.abs(hsl.h - lockedHsl.h));
          const dS = Math.abs(hsl.s - lockedHsl.s);
          const dL = Math.abs(hsl.l - lockedHsl.l);
          const score = dH * 1.5 + dS * 0.8 + dL * 1.0;
          if (score < minDiff) {
            minDiff = score;
            bestTemplate = p;
            bestSlot = s;
          }
        }
      }

      const templateRgb = hexToRgb(bestTemplate[bestSlot]) || { r: 128, g: 128, b: 128 };
      const templateHsl = rgbToHsl(templateRgb.r, templateRgb.g, templateRgb.b);
      const hueDiff = (lockedHsl.h - templateHsl.h + 360) % 360;

      for (let i = 0; i < 5; i++) {
        if (lockedColors[i]) {
          resultColors.push(lockedColors[i]!.toLowerCase());
        } else {
          const tRgb = hexToRgb(bestTemplate[i]) || { r: 128, g: 128, b: 128 };
          const tHsl = rgbToHsl(tRgb.r, tRgb.g, tRgb.b);
          let newH = (tHsl.h + hueDiff + 360) % 360;
          let newS = tHsl.s;
          let newL = tHsl.l;

          if (targetMood === "warm") {
            if (newH >= 110 && newH <= 280) newH = (newH % 60) + (Math.random() < 0.5 ? 15 : 345);
            newS = Math.max(20, Math.min(95, newS));
            newL = Math.max(12, Math.min(90, newL));
          } else if (targetMood === "cool") {
            if (newH < 75 || newH > 325) newH = 175 + Math.floor(Math.random() * 70);
            newS = Math.max(20, Math.min(95, newS));
            newL = Math.max(12, Math.min(92, newL));
          } else if (targetMood === "pastel") {
            newS = Math.max(25, Math.min(62, Math.round(newS * 0.85)));
            newL = Math.max(72, Math.min(94, Math.round(newL * 0.4 + 55)));
          } else if (targetMood === "vivid") {
            newS = Math.max(78, Math.min(100, Math.round(newS * 1.25)));
            newL = Math.max(42, Math.min(64, newL));
          } else if (targetMood === "neon") {
            newS = Math.max(88, Math.min(100, Math.round(newS * 1.3)));
            newL = Math.max(50, Math.min(65, newL));
          }

          resultColors.push(hslToHex(newH, newS, newL));
        }
      }
    }

    return {
      colors: resultColors as [string, string, string, string, string],
      mood: targetMood,
      moodLabel: moodOption.label
    };
  } catch (err) {
    console.error("팔레트 생성 오류:", err);
    return {
      colors: ["#69d2e7", "#a7dbd8", "#e0e4cc", "#f38630", "#fa6900"],
      mood: selectedMood,
      moodLabel: "클래식 조화"
    };
  }
}

/**
 * 5색 팔레트를 포토샵 및 디자인 작업용 고해상도 PNG 이미지 Canvas로 렌더링합니다.
 * @param colors 5색 팔레트 Hex 배열
 * @param moodLabel 팔레트 무드 라벨 (예: "따스한 웜톤 & 카페")
 */
export function renderPaletteCanvas(
  colors: readonly [string, string, string, string, string],
  moodLabel: string
): HTMLCanvasElement | null {
  try {
    if (typeof document === "undefined") return null;

    const width = 1200;
    const height = 630;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // 1. 다크 프리미엄 배경 렌더링
    ctx.fillStyle = "#090d16";
    ctx.fillRect(0, 0, width, height);

    // 은은한 외곽 보더
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, width - 2, height - 2);

    // 2. 상단 헤더 텍스트
    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 13px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillText("COLOR PALETTE", 44, 48);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 24px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillText(moodLabel, 44, 80);

    // 우측 워터마크
    ctx.fillStyle = "#64748b";
    ctx.font = "600 15px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText("xitora.cc", width - 44, 68);
    ctx.textAlign = "left";

    // 3. 5색 스와치 렌더링 (포토샵 스포이드로 채취하기 편한 넓은 면적)
    const startX = 44;
    const startY = 110;
    const totalWidth = width - 88;
    const gap = 14;
    const colWidth = (totalWidth - gap * 4) / 5;
    const colHeight = 430;
    const swatchHeight = 315;
    const radius = 12;

    colors.forEach((hex, i) => {
      const x = startX + i * (colWidth + gap);
      const y = startY;

      ctx.save();
      ctx.beginPath();
      if (typeof ctx.roundRect === "function") {
        ctx.roundRect(x, y, colWidth, colHeight, radius);
      } else {
        ctx.rect(x, y, colWidth, colHeight);
      }
      ctx.clip();

      // 메인 컬러 영역 (스포이드 채취용)
      ctx.fillStyle = hex;
      ctx.fillRect(x, y, colWidth, swatchHeight);

      // 하단 메타 정보 배경
      ctx.fillStyle = "#111724";
      ctx.fillRect(x, y + swatchHeight, colWidth, colHeight - swatchHeight);

      // 경계선
      ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y + swatchHeight);
      ctx.lineTo(x + colWidth, y + swatchHeight);
      ctx.stroke();

      // 슬롯 인덱스 넘버 (01, 02 ...)
      ctx.fillStyle = "#64748b";
      ctx.font = "700 12px monospace";
      ctx.fillText(`0${i + 1}`, x + 16, y + swatchHeight + 28);

      // 대문자 HEX 코드
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 17px monospace";
      ctx.fillText(hex.toUpperCase(), x + 16, y + swatchHeight + 58);

      // RGB 값
      const rgb = hexToRgb(hex) || { r: 0, g: 0, b: 0 };
      ctx.fillStyle = "#94a3b8";
      ctx.font = "500 12px monospace";
      ctx.fillText(`RGB ${rgb.r}, ${rgb.g}, ${rgb.b}`, x + 16, y + swatchHeight + 84);

      ctx.restore();

      // 카드 외곽선
      ctx.save();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      if (typeof ctx.roundRect === "function") {
        ctx.roundRect(x, y, colWidth, colHeight, radius);
      } else {
        ctx.rect(x, y, colWidth, colHeight);
      }
      ctx.stroke();
      ctx.restore();
    });

    // 4. 하단 팁 가이드
    ctx.fillStyle = "#64748b";
    ctx.font = "500 12px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillText("Tip: 포토샵에서 붙여넣기(Ctrl+V) 후 스포이드 도구(I)로 색상을 추출하여 바로 작업할 수 있습니다.", 44, 582);

    return canvas;
  } catch (err) {
    console.error("팔레트 캔버스 렌더링 오류:", err);
    return null;
  }
}


