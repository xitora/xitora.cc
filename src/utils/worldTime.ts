// 세계 각국 타임존 연산, 비즈니스 오버랩 계산 및 도시 프리셋 데이터

export interface CityPreset {
  id: string;
  nameKo: string;
  nameEn: string;
  countryKo: string;
  countryCode: string;
  flag: string;
  timeZone: string;
}

export interface ZoneTimeInfo {
  year: number;
  month: number;
  day: number;
  hours: number;
  minutes: number;
  seconds: number;
  dayOfWeekKo: string;
  formattedTime: string;
  formattedDate: string;
  dayOffset: number; // 기준 날짜 대비 일자 차이 (-1, 0, +1 등)
  gmtOffsetString: string;
  isBusinessHours: boolean;
  timeState: 'business' | 'awake' | 'sleep';
}

export interface OverlapRange {
  startHour: number;
  endHour: number;
  durationHours: number;
  overlappingCitiesCount: number;
  totalCitiesCount: number;
  isAllOverlap: boolean;
}

/**
 * 전 세계 주요 비즈니스 및 인기 도시 프리셋 (60+ 도시)
 */
export const WORLD_CITIES: CityPreset[] = [
  { id: 'seoul', nameKo: '서울', nameEn: 'Seoul', countryKo: '대한민국', countryCode: 'KR', flag: '🇰🇷', timeZone: 'Asia/Seoul' },
  { id: 'tokyo', nameKo: '도쿄', nameEn: 'Tokyo', countryKo: '일본', countryCode: 'JP', flag: '🇯🇵', timeZone: 'Asia/Tokyo' },
  { id: 'london', nameKo: '런던', nameEn: 'London', countryKo: '영국', countryCode: 'GB', flag: '🇬🇧', timeZone: 'Europe/London' },
  { id: 'new-york', nameKo: '뉴욕', nameEn: 'New York', countryKo: '미국', countryCode: 'US', flag: '🇺🇸', timeZone: 'America/New_York' },
  { id: 'san-francisco', nameKo: '샌프란시스코', nameEn: 'San Francisco', countryKo: '미국', countryCode: 'US', flag: '🇺🇸', timeZone: 'America/Los_Angeles' },
  { id: 'paris', nameKo: '파리', nameEn: 'Paris', countryKo: '프랑스', countryCode: 'FR', flag: '🇫🇷', timeZone: 'Europe/Paris' },
  { id: 'berlin', nameKo: '베를린', nameEn: 'Berlin', countryKo: '독일', countryCode: 'DE', flag: '🇩🇪', timeZone: 'Europe/Berlin' },
  { id: 'sydney', nameKo: '시드니', nameEn: 'Sydney', countryKo: '호주', countryCode: 'AU', flag: '🇦🇺', timeZone: 'Australia/Sydney' },
  { id: 'singapore', nameKo: '싱가포르', nameEn: 'Singapore', countryKo: '싱가포르', countryCode: 'SG', flag: '🇸🇬', timeZone: 'Asia/Singapore' },
  { id: 'hong-kong', nameKo: '홍콩', nameEn: 'Hong Kong', countryKo: '홍콩', countryCode: 'HK', flag: '🇭🇰', timeZone: 'Asia/Hong_Kong' },
  { id: 'shanghai', nameKo: '상하이', nameEn: 'Shanghai', countryKo: '중국', countryCode: 'CN', flag: '🇨🇳', timeZone: 'Asia/Shanghai' },
  { id: 'dubai', nameKo: '두바이', nameEn: 'Dubai', countryKo: '아랍에미리트', countryCode: 'AE', flag: '🇦🇪', timeZone: 'Asia/Dubai' },
  { id: 'chicago', nameKo: '시카고', nameEn: 'Chicago', countryKo: '미국', countryCode: 'US', flag: '🇺🇸', timeZone: 'America/Chicago' },
  { id: 'toronto', nameKo: '토론토', nameEn: 'Toronto', countryKo: '캐나다', countryCode: 'CA', flag: '🇨🇦', timeZone: 'America/Toronto' },
  { id: 'vancouver', nameKo: '밴쿠버', nameEn: 'Vancouver', countryKo: '캐나다', countryCode: 'CA', flag: '🇨🇦', timeZone: 'America/Vancouver' },
  { id: 'taipei', nameKo: '타이베이', nameEn: 'Taipei', countryKo: '대만', countryCode: 'TW', flag: '🇹🇼', timeZone: 'Asia/Taipei' },
  { id: 'bangkok', nameKo: '방콕', nameEn: 'Bangkok', countryKo: '태국', countryCode: 'TH', flag: '🇹🇭', timeZone: 'Asia/Bangkok' },
  { id: 'mumbai', nameKo: '뭄바이', nameEn: 'Mumbai', countryKo: '인도', countryCode: 'IN', flag: '🇮🇳', timeZone: 'Asia/Kolkata' },
  { id: 'amsterdam', nameKo: '암스테르담', nameEn: 'Amsterdam', countryKo: '네덜란드', countryCode: 'NL', flag: '🇳🇱', timeZone: 'Europe/Amsterdam' },
  { id: 'zurich', nameKo: '취리히', nameEn: 'Zurich', countryKo: '스위스', countryCode: 'CH', flag: '🇨🇭', timeZone: 'Europe/Zurich' },
  { id: 'auckland', nameKo: '오클랜드', nameEn: 'Auckland', countryKo: '뉴질랜드', countryCode: 'NZ', flag: '🇳🇿', timeZone: 'Pacific/Auckland' },
  { id: 'honolulu', nameKo: '호놀룰루', nameEn: 'Honolulu', countryKo: '미국', countryCode: 'US', flag: '🇺🇸', timeZone: 'Pacific/Honolulu' },
  { id: 'sao-paulo', nameKo: '상파울루', nameEn: 'Sao Paulo', countryKo: '브라질', countryCode: 'BR', flag: '🇧🇷', timeZone: 'America/Sao_Paulo' },
  { id: 'mexico-city', nameKo: '멕시코시티', nameEn: 'Mexico City', countryKo: '멕시코', countryCode: 'MX', flag: '🇲🇽', timeZone: 'America/Mexico_City' },
  { id: 'rome', nameKo: '로마', nameEn: 'Rome', countryKo: '이탈리아', countryCode: 'IT', flag: '🇮🇹', timeZone: 'Europe/Rome' },
  { id: 'madrid', nameKo: '마드리드', nameEn: 'Madrid', countryKo: '스페인', countryCode: 'ES', flag: '🇪🇸', timeZone: 'Europe/Madrid' },
  { id: 'stockholm', nameKo: '스톡홀름', nameEn: 'Stockholm', countryKo: '스웨덴', countryCode: 'SE', flag: '🇸🇪', timeZone: 'Europe/Stockholm' },
  { id: 'vienna', nameKo: '빈', nameEn: 'Vienna', countryKo: '오스트리아', countryCode: 'AT', flag: '🇦🇹', timeZone: 'Europe/Vienna' },
  { id: 'helsinki', nameKo: '헬싱키', nameEn: 'Helsinki', countryKo: '핀란드', countryCode: 'FI', flag: '🇫🇮', timeZone: 'Europe/Helsinki' },
  { id: 'dublin', nameKo: '더블린', nameEn: 'Dublin', countryKo: '아일랜드', countryCode: 'IE', flag: '🇮🇪', timeZone: 'Europe/Dublin' },
  { id: 'kuala-lumpur', nameKo: '쿠알라룸푸르', nameEn: 'Kuala Lumpur', countryKo: '말레이시아', countryCode: 'MY', flag: '🇲🇾', timeZone: 'Asia/Kuala_Lumpur' },
  { id: 'jakarta', nameKo: '자카르타', nameEn: 'Jakarta', countryKo: '인도네시아', countryCode: 'ID', flag: '🇮🇩', timeZone: 'Asia/Jakarta' },
  { id: 'manila', nameKo: '마닐라', nameEn: 'Manila', countryKo: '필리핀', countryCode: 'PH', flag: '🇵🇭', timeZone: 'Asia/Manila' },
  { id: 'ho-chi-minh', nameKo: '호치민', nameEn: 'Ho Chi Minh', countryKo: '베트남', countryCode: 'VN', flag: '🇻🇳', timeZone: 'Asia/Ho_Chi_Minh' },
  { id: 'istanbul', nameKo: '이스탄불', nameEn: 'Istanbul', countryKo: '튀르키예', countryCode: 'TR', flag: '🇹🇷', timeZone: 'Europe/Istanbul' },
  { id: 'cairo', nameKo: '카이로', nameEn: 'Cairo', countryKo: '이집트', countryCode: 'EG', flag: '🇪🇬', timeZone: 'Africa/Cairo' },
  { id: 'johannesburg', nameKo: '요하네스버그', nameEn: 'Johannesburg', countryKo: '남아공', countryCode: 'ZA', flag: '🇿🇦', timeZone: 'Africa/Johannesburg' },
  { id: 'buenos-aires', nameKo: '부에노스아이레스', nameEn: 'Buenos Aires', countryKo: '아르헨티나', countryCode: 'AR', flag: '🇦🇷', timeZone: 'America/Argentina/Buenos_Aires' },
  { id: 'santiago', nameKo: '산티아고', nameEn: 'Santiago', countryKo: '칠레', countryCode: 'CL', flag: '🇨🇱', timeZone: 'America/Santiago' },
  { id: 'los-angeles', nameKo: '로스앤젤레스', nameEn: 'Los Angeles', countryKo: '미국', countryCode: 'US', flag: '🇺🇸', timeZone: 'America/Los_Angeles' },
  { id: 'seattle', nameKo: '시애틀', nameEn: 'Seattle', countryKo: '미국', countryCode: 'US', flag: '🇺🇸', timeZone: 'America/Los_Angeles' },
  { id: 'austin', nameKo: '오스틴', nameEn: 'Austin', countryKo: '미국', countryCode: 'US', flag: '🇺🇸', timeZone: 'America/Chicago' },
  { id: 'boston', nameKo: '보스턴', nameEn: 'Boston', countryKo: '미국', countryCode: 'US', flag: '🇺🇸', timeZone: 'America/New_York' },
];

const DAY_NAMES_KO = ['일', '월', '화', '수', '목', '금', '토'];

/**
 * 특정 Date 객체와 TimeZone을 기반으로 정밀 로컬 시간 정보를 계산합니다.
 */
export function getZoneTimeInfo(
  date: Date,
  timeZone: string,
  referenceDate?: Date,
  is24Hour: boolean = true,
  businessStartHour: number = 9,
  businessEndHour: number = 18
): ZoneTimeInfo {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hourCycle: 'h23',
    });

    const parts = formatter.formatToParts(date);
    const partMap: Record<string, number> = {};

    for (const part of parts) {
      if (part.type !== 'literal') {
        partMap[part.type] = parseInt(part.value, 10);
      }
    }

    const year = partMap.year || date.getUTCFullYear();
    const month = partMap.month || date.getUTCMonth() + 1;
    const day = partMap.day || date.getUTCDate();
    const hours = partMap.hour !== undefined ? partMap.hour : date.getUTCHours();
    const minutes = partMap.minute !== undefined ? partMap.minute : date.getUTCMinutes();
    const seconds = partMap.second !== undefined ? partMap.second : date.getUTCSeconds();

    // 해당 날짜의 요일 계산
    const localDateObj = new Date(year, month - 1, day);
    const dayOfWeekKo = DAY_NAMES_KO[localDateObj.getDay()];

    // 기준 날짜와의 일자 차이(dayOffset) 계산
    let dayOffset = 0;
    if (referenceDate) {
      const refFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
      });
      const refParts = refFormatter.formatToParts(referenceDate);
      const refMap: Record<string, number> = {};
      for (const p of refParts) {
        if (p.type !== 'literal') refMap[p.type] = parseInt(p.value, 10);
      }
      const refDateObj = new Date(refMap.year || referenceDate.getFullYear(), (refMap.month || referenceDate.getMonth() + 1) - 1, refMap.day || referenceDate.getDate());
      const diffTime = localDateObj.getTime() - refDateObj.getTime();
      dayOffset = Math.round(diffTime / (1000 * 60 * 60 * 24));
    }

    // 시간 포맷팅
    let formattedTime = '';
    if (is24Hour) {
      formattedTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    } else {
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 === 0 ? 12 : hours % 12;
      formattedTime = `${String(displayHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${period}`;
    }

    const formattedDate = `${month}/${day} (${dayOfWeekKo})`;

    // GMT 오프셋 문자열 계산 (예: GMT+9, GMT-5)
    let gmtOffsetString = 'GMT';
    try {
      const tzFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone,
        timeZoneName: 'shortOffset',
      });
      const tzParts = tzFormatter.formatToParts(date);
      const tzPart = tzParts.find((p) => p.type === 'timeZoneName');
      if (tzPart) gmtOffsetString = tzPart.value;
    } catch {
      // 구형 브라우저 fallback
    }

    // 근무 / 활동 / 취침 상태 판별
    const isBusinessHours = hours >= businessStartHour && hours < businessEndHour;
    let timeState: 'business' | 'awake' | 'sleep' = 'sleep';
    if (isBusinessHours) {
      timeState = 'business';
    } else if (hours >= 7 && hours < 23) {
      timeState = 'awake';
    } else {
      timeState = 'sleep';
    }

    return {
      year,
      month,
      day,
      hours,
      minutes,
      seconds,
      dayOfWeekKo,
      formattedTime,
      formattedDate,
      dayOffset,
      gmtOffsetString,
      isBusinessHours,
      timeState,
    };
  } catch (err) {
    console.error(`Failed to format timezone ${timeZone}:`, err);
    return {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
      hours: date.getHours(),
      minutes: date.getMinutes(),
      seconds: date.getSeconds(),
      dayOfWeekKo: '일',
      formattedTime: '00:00',
      formattedDate: '1/1',
      dayOffset: 0,
      gmtOffsetString: 'GMT',
      isBusinessHours: false,
      timeState: 'sleep',
    };
  }
}

/**
 * 특정 타임존의 기준 일시(date)에 대한 UTC 오프셋 문자열을 반환합니다. (예: UTC+9, UTC-4, UTC+0)
 */
export function getUtcOffsetString(timeZone: string, date: Date = new Date()): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'shortOffset',
    });
    const parts = formatter.formatToParts(date);
    const tzPart = parts.find((p) => p.type === 'timeZoneName')?.value || '';
    if (!tzPart || tzPart === 'GMT' || tzPart === 'UTC') {
      return 'UTC+0';
    }
    return tzPart.replace('GMT', 'UTC');
  } catch (err) {
    console.error(`Failed to get UTC offset for ${timeZone}:`, err);
    return 'UTC';
  }
}

/**
 * 24시간 전체 구간 중 여러 도시의 근무 시간이 겹치는 교집합(골든 타임)을 산출합니다.
 */
export function calculateBusinessOverlap(
  cities: CityPreset[],
  masterDate: Date,
  businessStartHour: number = 9,
  businessEndHour: number = 18
): {
  hourlyOverlaps: { hour: number; count: number; isAll: boolean }[];
  goldenRanges: OverlapRange[];
} {
  if (cities.length === 0) {
    return { hourlyOverlaps: [], goldenRanges: [] };
  }

  const baseYear = masterDate.getFullYear();
  const baseMonth = masterDate.getMonth();
  const baseDay = masterDate.getDate();

  const hourlyOverlaps: { hour: number; count: number; isAll: boolean }[] = [];

  for (let h = 0; h < 24; h++) {
    const testDate = new Date(baseYear, baseMonth, baseDay, h, 0, 0);
    let matchCount = 0;

    for (const city of cities) {
      const info = getZoneTimeInfo(testDate, city.timeZone, masterDate, true, businessStartHour, businessEndHour);
      if (info.isBusinessHours) {
        matchCount++;
      }
    }

    hourlyOverlaps.push({
      hour: h,
      count: matchCount,
      isAll: matchCount === cities.length,
    });
  }

  // 연속된 전체 겹침(또는 최대 겹침) 구간 그룹화
  const goldenRanges: OverlapRange[] = [];
  let currentRangeStart: number | null = null;
  const targetMax = Math.max(...hourlyOverlaps.map((o) => o.count));

  for (let h = 0; h < 24; h++) {
    const slot = hourlyOverlaps[h];
    const isTarget = slot.count === targetMax && targetMax > 0;

    if (isTarget) {
      if (currentRangeStart === null) currentRangeStart = h;
    } else {
      if (currentRangeStart !== null) {
        goldenRanges.push({
          startHour: currentRangeStart,
          endHour: h,
          durationHours: h - currentRangeStart,
          overlappingCitiesCount: targetMax,
          totalCitiesCount: cities.length,
          isAllOverlap: targetMax === cities.length,
        });
        currentRangeStart = null;
      }
    }
  }

  if (currentRangeStart !== null) {
    goldenRanges.push({
      startHour: currentRangeStart,
      endHour: 24,
      durationHours: 24 - currentRangeStart,
      overlappingCitiesCount: targetMax,
      totalCitiesCount: cities.length,
      isAllOverlap: targetMax === cities.length,
    });
  }

  return { hourlyOverlaps, goldenRanges };
}

/**
 * 선택된 도시 목록과 시간을 URL 쿼리 파라미터 문자열로 직렬화합니다.
 */
export function encodeWorldTimeShare(cityIds: string[], timestampMs: number): string {
  try {
    const params = new URLSearchParams();
    params.set('cities', cityIds.join(','));
    params.set('t', String(timestampMs));
    return params.toString();
  } catch {
    return '';
  }
}

/**
 * URL 쿼리 파라미터로부터 도시 목록과 타임스탬프를 복원합니다.
 */
export function decodeWorldTimeShare(searchQuery: string): { cityIds: string[]; timestampMs: number | null } {
  try {
    const cleanSearch = searchQuery.startsWith('?') ? searchQuery.slice(1) : searchQuery;
    const params = new URLSearchParams(cleanSearch);
    const citiesParam = params.get('cities');
    const tParam = params.get('t');

    const cityIds = citiesParam ? citiesParam.split(',').filter(Boolean) : [];
    const timestampMs = tParam ? Number(tParam) : null;

    return {
      cityIds,
      timestampMs: timestampMs !== null && Number.isFinite(new Date(timestampMs).getTime()) ? timestampMs : null,
    };
  } catch {
    return { cityIds: [], timestampMs: null };
  }
}
