// URL 파서 및 쿼리스트링 빌더 유틸리티

export interface QueryParamItem {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

export interface ParsedUrlDetails {
  isValid: boolean;
  rawUrl: string;
  protocol: string;
  username: string;
  password: string;
  hostname: string;
  port: string;
  pathname: string;
  search: string;
  hash: string;
  origin: string;
  params: QueryParamItem[];
  errorMessage?: string;
}

/**
 * URL 문자열을 파싱하여 세부 구조와 파라미터 목록을 반환
 */
export function parseUrlString(urlString: string): ParsedUrlDetails {
  if (!urlString || urlString.trim() === '') {
    return {
      isValid: false,
      rawUrl: '',
      protocol: '',
      username: '',
      password: '',
      hostname: '',
      port: '',
      pathname: '',
      search: '',
      hash: '',
      origin: '',
      params: [],
    };
  }

  try {
    // 프로토콜이 생략된 경우 (예: example.com/api) 보정 시도
    let normalized = urlString.trim();
    if (!normalized.includes('://') && !normalized.startsWith('//')) {
      normalized = `https://${normalized}`;
    }

    const parsed = new URL(normalized);
    const params: QueryParamItem[] = [];

    parsed.searchParams.forEach((val, key) => {
      params.push({
        id: `${key}_${Math.random().toString(36).slice(2, 8)}`,
        key,
        value: val,
        enabled: true,
      });
    });

    return {
      isValid: true,
      rawUrl: urlString,
      protocol: parsed.protocol.replace(':', ''),
      username: parsed.username,
      password: parsed.password,
      hostname: parsed.hostname,
      port: parsed.port,
      pathname: parsed.pathname,
      search: parsed.search,
      hash: parsed.hash.replace('#', ''),
      origin: parsed.origin,
      params,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : '올바른 URL 형식이 아닙니다.';
    return {
      isValid: false,
      rawUrl: urlString,
      protocol: '',
      username: '',
      password: '',
      hostname: '',
      port: '',
      pathname: '',
      search: '',
      hash: '',
      origin: '',
      params: [],
      errorMessage: errorMsg,
    };
  }
}

/**
 * 컴포넌트 정보와 쿼리 파라미터 목록을 결합하여 완전한 URL을 재조합
 */
export function buildUrlString(
  baseDetails: {
    protocol?: string;
    hostname?: string;
    port?: string;
    pathname?: string;
    hash?: string;
    origin?: string;
  },
  params: QueryParamItem[]
): string {
  try {
    let base = '';
    if (baseDetails.origin && baseDetails.origin !== 'null') {
      base = baseDetails.origin;
    } else {
      const proto = baseDetails.protocol ? `${baseDetails.protocol}://` : 'https://';
      const host = baseDetails.hostname || 'localhost';
      const portStr = baseDetails.port ? `:${baseDetails.port}` : '';
      base = `${proto}${host}${portStr}`;
    }

    const path = baseDetails.pathname
      ? baseDetails.pathname.startsWith('/')
        ? baseDetails.pathname
        : `/${baseDetails.pathname}`
      : '/';

    const url = new URL(path, base);

    // 활성화된 파라미터만 추가
    params.forEach((param) => {
      if (param.enabled && param.key.trim() !== '') {
        url.searchParams.append(param.key.trim(), param.value);
      }
    });

    if (baseDetails.hash && baseDetails.hash.trim() !== '') {
      url.hash = baseDetails.hash.startsWith('#')
        ? baseDetails.hash
        : `#${baseDetails.hash}`;
    }

    return url.toString();
  } catch {
    return '';
  }
}

export interface UrlPreset {
  title: string;
  description: string;
  url: string;
}

export const URL_SAMPLE_PRESETS: UrlPreset[] = [
  {
    title: 'OAuth 2.0 인가 요청',
    description: 'client_id, redirect_uri, scope, state 복합 파라미터',
    url: 'https://accounts.google.com/o/oauth2/v2/auth?client_id=123456789.apps.googleusercontent.com&redirect_uri=https%3A%2F%2Fmyapp.com%2Fcallback&response_type=code&scope=openid%20profile%20email&state=xyzState123#step1',
  },
  {
    title: 'E-커머스 검색 필터링',
    description: '카테고리, 가격대, 정렬, 페이지네이션 쿼리',
    url: 'https://shop.example.com/items/category/tech?brand=apple&price_min=500000&price_max=1500000&sort=popular&page=2&in_stock=true',
  },
  {
    title: 'REST API 페이지네이션',
    description: 'v1 API 엔드포인트와 limit, offset, sort 쿼리',
    url: 'https://api.github.com/users/octocat/repos?per_page=30&page=1&sort=updated&direction=desc',
  },
];
