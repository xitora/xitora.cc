// SVG Path (d 속성) 파싱 및 기하학적 노드 분석 유틸리티

export type SvgCommandType =
  | 'M' | 'm'
  | 'L' | 'l'
  | 'H' | 'h'
  | 'V' | 'v'
  | 'C' | 'c'
  | 'S' | 's'
  | 'Q' | 'q'
  | 'T' | 't'
  | 'A' | 'a'
  | 'Z' | 'z';

export interface Point2D {
  x: number;
  y: number;
}

export interface PathSegment {
  index: number;
  command: SvgCommandType;
  isRelative: boolean;
  args: number[];
  startPoint: Point2D;
  endPoint: Point2D;
  controlPoints: Point2D[]; // 베지어 곡선의 제어점들 (cp1, cp2)
  rawString: string;
}

export interface PathAnalysis {
  isValid: boolean;
  segments: PathSegment[];
  totalPoints: number;
  bezierCount: number;
  lineCount: number;
  boundingBox: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    width: number;
    height: number;
  };
  errorMessage?: string;
}

/**
 * SVG Path 문자열 토큰화
 */
function tokenizeSvgPath(d: string): { command: SvgCommandType; args: number[]; raw: string }[] {
  const result: { command: SvgCommandType; args: number[]; raw: string }[] = [];
  // SVG 명령어(문자)를 기준으로 분할
  const commandRegex = /([a-df-z])([^a-df-z]*)/gi;
  let match: RegExpExecArray | null;

  while ((match = commandRegex.exec(d)) !== null) {
    const cmd = match[1] as SvgCommandType;
    const argStr = match[2].trim();
    // 음수, 소수점, 지수표기법 숫자를 안전하게 분리
    const numberRegex = /[-+]?(?:\d*\.\d+|\d+)(?:[eE][-+]?\d+)?/g;
    const args: number[] = [];
    let numMatch: RegExpExecArray | null;
    while ((numMatch = numberRegex.exec(argStr)) !== null) {
      args.push(parseFloat(numMatch[0]));
    }
    result.push({
      command: cmd,
      args,
      raw: `${cmd} ${argStr}`.trim(),
    });
  }

  return result;
}

/**
 * SVG Path 문자열을 파싱하여 세그먼트, 끝점, 제어점 좌표 및 바운딩 박스를 계산
 */
export function parseSvgPath(d: string): PathAnalysis {
  if (!d || d.trim() === '') {
    return {
      isValid: false,
      segments: [],
      totalPoints: 0,
      bezierCount: 0,
      lineCount: 0,
      boundingBox: { minX: 0, minY: 0, maxX: 100, maxY: 100, width: 100, height: 100 },
      errorMessage: 'SVG Path 데이터가 비어 있습니다.',
    };
  }

  try {
    const tokens = tokenizeSvgPath(d);
    if (tokens.length === 0) {
      return {
        isValid: false,
        segments: [],
        totalPoints: 0,
        bezierCount: 0,
        lineCount: 0,
        boundingBox: { minX: 0, minY: 0, maxX: 100, maxY: 100, width: 100, height: 100 },
        errorMessage: '유효한 SVG Path 명령어를 찾을 수 없습니다.',
      };
    }

    const segments: PathSegment[] = [];
    let curX = 0;
    let curY = 0;
    let startSubpathX = 0;
    let startSubpathY = 0;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    const updateBounds = (x: number, y: number) => {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    };

    let bezierCount = 0;
    let lineCount = 0;
    let segIndex = 0;

    tokens.forEach((tok) => {
      const cmd = tok.command;
      const isRel = cmd === cmd.toLowerCase() && cmd.toLowerCase() !== 'z';
      const upperCmd = cmd.toUpperCase();
      const start: Point2D = { x: curX, y: curY };
      const controlPoints: Point2D[] = [];
      let endX = curX;
      let endY = curY;

      switch (upperCmd) {
        case 'M': {
          const x = isRel ? curX + (tok.args[0] || 0) : tok.args[0] || 0;
          const y = isRel ? curY + (tok.args[1] || 0) : tok.args[1] || 0;
          endX = x;
          endY = y;
          startSubpathX = x;
          startSubpathY = y;
          break;
        }
        case 'L': {
          lineCount++;
          endX = isRel ? curX + (tok.args[0] || 0) : tok.args[0] || 0;
          endY = isRel ? curY + (tok.args[1] || 0) : tok.args[1] || 0;
          break;
        }
        case 'H': {
          lineCount++;
          endX = isRel ? curX + (tok.args[0] || 0) : tok.args[0] || 0;
          break;
        }
        case 'V': {
          lineCount++;
          endY = isRel ? curY + (tok.args[0] || 0) : tok.args[0] || 0;
          break;
        }
        case 'C': {
          bezierCount++;
          const cp1x = isRel ? curX + (tok.args[0] || 0) : tok.args[0] || 0;
          const cp1y = isRel ? curY + (tok.args[1] || 0) : tok.args[1] || 0;
          const cp2x = isRel ? curX + (tok.args[2] || 0) : tok.args[2] || 0;
          const cp2y = isRel ? curY + (tok.args[3] || 0) : tok.args[3] || 0;
          endX = isRel ? curX + (tok.args[4] || 0) : tok.args[4] || 0;
          endY = isRel ? curY + (tok.args[5] || 0) : tok.args[5] || 0;
          controlPoints.push({ x: cp1x, y: cp1y }, { x: cp2x, y: cp2y });
          updateBounds(cp1x, cp1y);
          updateBounds(cp2x, cp2y);
          break;
        }
        case 'S': {
          bezierCount++;
          const cp2x = isRel ? curX + (tok.args[0] || 0) : tok.args[0] || 0;
          const cp2y = isRel ? curY + (tok.args[1] || 0) : tok.args[1] || 0;
          endX = isRel ? curX + (tok.args[2] || 0) : tok.args[2] || 0;
          endY = isRel ? curY + (tok.args[3] || 0) : tok.args[3] || 0;
          controlPoints.push({ x: cp2x, y: cp2y });
          updateBounds(cp2x, cp2y);
          break;
        }
        case 'Q': {
          bezierCount++;
          const cpx = isRel ? curX + (tok.args[0] || 0) : tok.args[0] || 0;
          const cpy = isRel ? curY + (tok.args[1] || 0) : tok.args[1] || 0;
          endX = isRel ? curX + (tok.args[2] || 0) : tok.args[2] || 0;
          endY = isRel ? curY + (tok.args[3] || 0) : tok.args[3] || 0;
          controlPoints.push({ x: cpx, y: cpy });
          updateBounds(cpx, cpy);
          break;
        }
        case 'A': {
          endX = isRel ? curX + (tok.args[5] || 0) : tok.args[5] || 0;
          endY = isRel ? curY + (tok.args[6] || 0) : tok.args[6] || 0;
          break;
        }
        case 'Z': {
          endX = startSubpathX;
          endY = startSubpathY;
          break;
        }
        default: {
          endX = curX;
          endY = curY;
        }
      }

      updateBounds(endX, endY);

      segments.push({
        index: segIndex++,
        command: cmd,
        isRelative: isRel,
        args: tok.args,
        startPoint: start,
        endPoint: { x: endX, y: endY },
        controlPoints,
        rawString: tok.raw,
      });

      curX = endX;
      curY = endY;
    });

    if (minX === Infinity) {
      minX = 0;
      minY = 0;
      maxX = 100;
      maxY = 100;
    }

    const pad = 10;
    const width = Math.max(maxX - minX, 10);
    const height = Math.max(maxY - minY, 10);

    return {
      isValid: true,
      segments,
      totalPoints: segments.length,
      bezierCount,
      lineCount,
      boundingBox: {
        minX: minX - pad,
        minY: minY - pad,
        maxX: maxX + pad,
        maxY: maxY + pad,
        width: width + pad * 2,
        height: height + pad * 2,
      },
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Path 파싱 중 오류가 발생했습니다.';
    return {
      isValid: false,
      segments: [],
      totalPoints: 0,
      bezierCount: 0,
      lineCount: 0,
      boundingBox: { minX: 0, minY: 0, maxX: 100, maxY: 100, width: 100, height: 100 },
      errorMessage: errorMsg,
    };
  }
}

export interface SvgPreset {
  title: string;
  description: string;
  d: string;
}

export const SVG_PATH_PRESETS: SvgPreset[] = [
  {
    title: '베지어 곡선 하트 (Heart)',
    description: '3차 베지어 및 호(Arc)로 구성된 하트 모양',
    d: 'M 50 85 C 20 55 5 40 5 25 A 20 20 0 0 1 45 15 L 50 20 L 55 15 A 20 20 0 0 1 95 25 C 95 40 80 55 50 85 Z',
  },
  {
    title: '말풍선 아이콘 (Message Bubble)',
    description: '호(Arc), 수평선, 꼬리표 라인으로 구성',
    d: 'M 20 20 H 80 A 10 10 0 0 1 90 30 V 65 A 10 10 0 0 1 80 75 H 45 L 25 90 V 75 A 10 10 0 0 1 15 65 V 30 A 10 10 0 0 1 20 20 Z',
  },
  {
    title: 'S자 3차 베지어 웨이브 (Wave)',
    description: 'Cubic Bézier(C)와 Smooth Bézier(S) 곡선 연결',
    d: 'M 10 80 C 40 10 65 10 95 80 S 150 150 180 80',
  },
  {
    title: '기하학 별 모양 (Star Polygon)',
    description: '10개 정점의 직선(L) 다각형 패스',
    d: 'M 50 5 L 63 35 L 95 38 L 71 61 L 78 95 L 50 77 L 22 95 L 29 61 L 5 38 L 37 35 Z',
  },
];
