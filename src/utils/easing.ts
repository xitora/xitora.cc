// CSS 애니메이션 이징(Easing) & Cubic-Bezier 계산 유틸리티

export interface CubicBezierHandle {
  x: number;
  y: number;
}

export interface EasingPreset {
  name: string;
  description: string;
  p1: CubicBezierHandle;
  p2: CubicBezierHandle;
}

export const EASING_PRESETS: EasingPreset[] = [
  {
    name: 'Ease (기본)',
    description: '가속 후 부드러운 감속',
    p1: { x: 0.25, y: 0.1 },
    p2: { x: 0.25, y: 1.0 },
  },
  {
    name: 'Ease-In (가속)',
    description: '서서히 빨라지는 시작',
    p1: { x: 0.42, y: 0.0 },
    p2: { x: 1.0, y: 1.0 },
  },
  {
    name: 'Ease-Out (감속)',
    description: '빠르게 시작 후 부드러운 정지',
    p1: { x: 0.0, y: 0.0 },
    p2: { x: 0.58, y: 1.0 },
  },
  {
    name: 'Ease-In-Out (양방향)',
    description: '부드러운 가속 및 감속 대칭',
    p1: { x: 0.42, y: 0.0 },
    p2: { x: 0.58, y: 1.0 },
  },
  {
    name: 'Linear (등속)',
    description: '변화 없는 일정 속도',
    p1: { x: 0.0, y: 0.0 },
    p2: { x: 1.0, y: 1.0 },
  },
  {
    name: 'Spring / Bounce (탄성)',
    description: '목표 지점 초과 후 되돌아오는 오버슈트 효과',
    p1: { x: 0.34, y: 1.56 },
    p2: { x: 0.64, y: 1.0 },
  },
  {
    name: 'Snappy (경쾌한 반응)',
    description: '모던 웹 UI에 최적화된 반응형 전환',
    p1: { x: 0.16, y: 1.0 },
    p2: { x: 0.3, y: 1.0 },
  },
  {
    name: 'Anticipate (예비 동작)',
    description: '반대 방향으로 살짝 당겼다 출발',
    p1: { x: 0.36, y: 0.0 },
    p2: { x: 0.66, y: -0.56 },
  },
];

/**
 * 3차 베지어 곡선의 특정 t 시점 X 좌표 계산
 */
function sampleCurveX(t: number, p1x: number, p2x: number): number {
  return ((1 - 3 * p2x + 3 * p1x) * t + (3 * p2x - 6 * p1x)) * t * t + 3 * p1x * t;
}

/**
 * 3차 베지어 곡선의 특정 t 시점 Y 좌표 계산
 */
function sampleCurveY(t: number, p1y: number, p2y: number): number {
  return ((1 - 3 * p2y + 3 * p1y) * t + (3 * p2y - 6 * p1y)) * t * t + 3 * p1y * t;
}

/**
 * X 좌표로부터 매개변수 t 역산 (Newton-Raphson 및 이분 탐색 결합)
 */
function solveCurveX(x: number, p1x: number, p2x: number): number {
  let t0 = 0;
  let t1 = 1;
  let t2 = x;

  if (t2 <= 0) return 0;
  if (t2 >= 1) return 1;

  for (let i = 0; i < 8; i++) {
    const x2 = sampleCurveX(t2, p1x, p2x);
    if (Math.abs(x2 - x) < 1e-4) return t2;
    // 도함수 dX/dt
    const d2 = (3 * (1 - 3 * p2x + 3 * p1x) * t2 + 2 * (3 * p2x - 6 * p1x)) * t2 + 3 * p1x;
    if (Math.abs(d2) < 1e-6) break;
    t2 = t2 - (x2 - x) / d2;
  }

  // 뉴턴법 실패 시 이분 탐색(Bisection)으로 보정
  while (t0 < t1) {
    const x2 = sampleCurveX(t2, p1x, p2x);
    if (Math.abs(x2 - x) < 1e-4) return t2;
    if (x > x2) {
      t0 = t2;
    } else {
      t1 = t2;
    }
    t2 = (t1 - t0) * 0.5 + t0;
  }

  return t2;
}

/**
 * 주어진 x(시간 진행률 0~1)에 대한 베지어 Y(애니메이션 진행률) 값 반환
 */
export function evaluateCubicBezier(
  x: number,
  p1x: number,
  p1y: number,
  p2x: number,
  p2y: number
): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const t = solveCurveX(x, p1x, p2x);
  return sampleCurveY(t, p1y, p2y);
}

/**
 * CSS cubic-bezier 문자열 포맷팅
 */
export function formatCubicBezier(
  p1x: number,
  p1y: number,
  p2x: number,
  p2y: number
): string {
  const round = (num: number) => Math.round(num * 100) / 100;
  return `cubic-bezier(${round(p1x)}, ${round(p1y)}, ${round(p2x)}, ${round(p2y)})`;
}

/**
 * CSS transition 코드 스니펫 생성
 */
export function generateCssTransition(
  durationSec: number,
  p1x: number,
  p1y: number,
  p2x: number,
  p2y: number
): string {
  const bezier = formatCubicBezier(p1x, p1y, p2x, p2y);
  return `transition: all ${durationSec}s ${bezier};`;
}

/**
 * Tailwind CSS arbitrary class 생성
 */
export function generateTailwindClass(
  p1x: number,
  p1y: number,
  p2x: number,
  p2y: number
): string {
  const bezier = formatCubicBezier(p1x, p1y, p2x, p2y);
  return `ease-[${bezier}] transition-all duration-500`;
}

/**
 * Framer Motion transition 객체 스니펫 생성
 */
export function generateFramerMotionSnippet(
  durationSec: number,
  p1x: number,
  p1y: number,
  p2x: number,
  p2y: number
): string {
  const round = (num: number) => Math.round(num * 100) / 100;
  return `transition={{
  duration: ${durationSec},
  ease: [${round(p1x)}, ${round(p1y)}, ${round(p2x)}, ${round(p2y)}]
}}`;
}

/**
 * Web Animations API (WAAPI) 스니펫 생성
 */
export function generateWaapiSnippet(
  durationSec: number,
  p1x: number,
  p1y: number,
  p2x: number,
  p2y: number
): string {
  const bezier = formatCubicBezier(p1x, p1y, p2x, p2y);
  return `element.animate([
  { transform: 'translateX(0px)', opacity: 0 },
  { transform: 'translateX(100px)', opacity: 1 }
], {
  duration: ${Math.round(durationSec * 1000)},
  easing: '${bezier}',
  fill: 'forwards'
});`;
}
