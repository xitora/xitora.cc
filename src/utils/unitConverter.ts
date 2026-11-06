// 단위 및 환율 변환기 유틸리티

export type UnitCategory = 'length' | 'area' | 'weight' | 'data' | 'currency';

export interface UnitDefinition {
  id: string;
  name: string; // 한글 명칭
  symbol: string; // 기호
  ratioToBase: number; // 기본 단위 대비 배율
}

// 1. 길이 (기준: m)
export const LENGTH_UNITS: UnitDefinition[] = [
  { id: 'mm', name: '밀리미터', symbol: 'mm', ratioToBase: 0.001 },
  { id: 'cm', name: '센티미터', symbol: 'cm', ratioToBase: 0.01 },
  { id: 'm', name: '미터', symbol: 'm', ratioToBase: 1 },
  { id: 'km', name: '킬로미터', symbol: 'km', ratioToBase: 1000 },
  { id: 'in', name: '인치', symbol: 'in', ratioToBase: 0.0254 },
  { id: 'ft', name: '피트', symbol: 'ft', ratioToBase: 0.3048 },
  { id: 'yd', name: '야드', symbol: 'yd', ratioToBase: 0.9144 },
  { id: 'mi', name: '마일', symbol: 'mi', ratioToBase: 1609.344 },
];

// 2. 면적 (기준: ㎡)
export const AREA_UNITS: UnitDefinition[] = [
  { id: 'm2', name: '제곱미터', symbol: '㎡', ratioToBase: 1 },
  { id: 'pyeong', name: '평', symbol: '평', ratioToBase: 3.305785 },
  { id: 'ha', name: '헥타르', symbol: 'ha', ratioToBase: 10000 },
  { id: 'ac', name: '에이커', symbol: 'ac', ratioToBase: 4046.856 },
  { id: 'ft2', name: '제곱피트', symbol: 'sq ft', ratioToBase: 0.092903 },
];

// 3. 무게 (기준: g)
export const WEIGHT_UNITS: UnitDefinition[] = [
  { id: 'mg', name: '밀리그램', symbol: 'mg', ratioToBase: 0.001 },
  { id: 'g', name: '그램', symbol: 'g', ratioToBase: 1 },
  { id: 'kg', name: '킬로그램', symbol: 'kg', ratioToBase: 1000 },
  { id: 't', name: '톤', symbol: 't', ratioToBase: 1000000 },
  { id: 'geun', name: '근 (고기/채소)', symbol: '근', ratioToBase: 600 },
  { id: 'oz', name: '온스', symbol: 'oz', ratioToBase: 28.3495 },
  { id: 'lb', name: '파운드', symbol: 'lb', ratioToBase: 453.592 },
];

// 4. 데이터: SI 단위(1000)와 이진 단위(1024)를 구분합니다.
export const DATA_UNITS: UnitDefinition[] = [
  { id: 'B', name: '바이트', symbol: 'B', ratioToBase: 1 },
  ...['KB', 'MB', 'GB', 'TB', 'PB'].map((id, index) => ({ id, name: `${id} (1000 기준)`, symbol: id, ratioToBase: 1000 ** (index + 1) })),
  ...['KiB', 'MiB', 'GiB', 'TiB', 'PiB'].map((id, index) => ({ id, name: `${id} (1024 기준)`, symbol: id, ratioToBase: 1024 ** (index + 1) })),
];

// 5. 수동 환율 입력의 계산 예시값 (기준: USD 1.0, 실시간 시세 아님)
export const DEFAULT_CURRENCY_RATES: Record<string, number> = {
  USD: 1.0,
  KRW: 1380.0,
  JPY: 152.5,
  EUR: 0.92,
  CNY: 7.24,
  GBP: 0.78,
  CAD: 1.38,
  AUD: 1.51,
};

export const CURRENCY_LIST = [
  { id: 'KRW', name: '대한민국 원', symbol: '₩' },
  { id: 'USD', name: '미국 달러', symbol: '$' },
  { id: 'JPY', name: '일본 엔', symbol: '¥' },
  { id: 'EUR', name: '유럽연합 유로', symbol: '€' },
  { id: 'CNY', name: '중국 위안', symbol: '¥' },
  { id: 'GBP', name: '영국 파운드', symbol: '£' },
  { id: 'CAD', name: '캐나다 달러', symbol: 'C$' },
  { id: 'AUD', name: '호주 달러', symbol: 'A$' },
];

/**
 * 카테고리별 단위 변환 함수
 */
export function convertUnit(
  value: number,
  fromId: string,
  toId: string,
  category: UnitCategory
): number {
  if (isNaN(value)) return 0;
  if (fromId === toId) return value;

  let unitList: UnitDefinition[] = [];
  if (category === 'length') unitList = LENGTH_UNITS;
  else if (category === 'area') unitList = AREA_UNITS;
  else if (category === 'weight') unitList = WEIGHT_UNITS;
  else if (category === 'data') unitList = DATA_UNITS;

  const fromUnit = unitList.find((u) => u.id === fromId);
  const toUnit = unitList.find((u) => u.id === toId);

  if (!fromUnit || !toUnit) return 0;

  // 기본 단위로 변환 후 목표 단위로 변환
  const baseValue = value * fromUnit.ratioToBase;
  return baseValue / toUnit.ratioToBase;
}

/**
 * 통화 환율 변환 함수
 */
export function convertCurrency(
  amount: number,
  fromCode: string,
  toCode: string,
  rates: Record<string, number> = DEFAULT_CURRENCY_RATES
): number {
  if (isNaN(amount) || amount === 0) return 0;
  if (fromCode === toCode) return amount;

  const fromRate = rates[fromCode] || 1;
  const toRate = rates[toCode] || 1;

  // USD 기준 변환: amount / fromRate * toRate
  const inUsd = amount / fromRate;
  return inUsd * toRate;
}

/**
 * 숫자 깔끔하게 포맷팅
 */
export function formatUnitNumber(num: number): string {
  if (isNaN(num)) return '0';
  if (num === 0) return '0';
  if (Math.abs(num) >= 1e9 || (Math.abs(num) < 1e-4 && num !== 0)) {
    return num.toExponential(4);
  }
  return Number(num.toFixed(4)).toLocaleString('ko-KR', { maximumFractionDigits: 4 });
}

export interface UnitPreset {
  title: string;
  category: UnitCategory;
  fromUnit: string;
  toUnit: string;
  value: number;
}

export const UNIT_SAMPLE_PRESETS: UnitPreset[] = [
  { title: '국민평형 84㎡ ➔ 평', category: 'area', fromUnit: 'm2', toUnit: 'pyeong', value: 84 },
  { title: '34평 ➔ 제곱미터(㎡)', category: 'area', fromUnit: 'pyeong', toUnit: 'm2', value: 34 },
  { title: '1파운드(lb) ➔ g/kg', category: 'weight', fromUnit: 'lb', toUnit: 'kg', value: 1 },
  { title: '삼겹살 1근 ➔ g', category: 'weight', fromUnit: 'geun', toUnit: 'g', value: 1 },
  { title: '100달러(USD) ➔ 원화', category: 'currency', fromUnit: 'USD', toUnit: 'KRW', value: 100 },
  { title: '1만엔(JPY) ➔ 원화', category: 'currency', fromUnit: 'JPY', toUnit: 'KRW', value: 10000 },
];
