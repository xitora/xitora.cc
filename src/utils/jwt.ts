/**
 * JWT(JSON Web Token) 디코더 및 검증 유틸리티
 * Base64Url 디코딩, 타임스탬프 변환, Web Crypto 기반 HMAC 서명 검증을 제공합니다.
 */

export interface JwtHeader {
  alg?: string;
  typ?: string;
  kid?: string;
  [key: string]: unknown;
}

export interface JwtPayload {
  iss?: string;
  sub?: string;
  aud?: string | string[];
  exp?: number;
  nbf?: number;
  iat?: number;
  jti?: string;
  [key: string]: unknown;
}

export interface DecodedJwt {
  header: JwtHeader;
  payload: JwtPayload;
  rawHeader: string;
  rawPayload: string;
  signature: string;
  headerJson: string;
  payloadJson: string;
}

export type TokenStatus = 'valid' | 'expired' | 'future' | 'malformed' | 'empty';

export interface TokenStatusInfo {
  status: TokenStatus;
  message: string;
  isExpired: boolean;
  expiresInText?: string;
  issuedAtText?: string;
  notBeforeText?: string;
}

/**
 * Base64Url 문자열을 UTF-8 문자열로 안전하게 디코딩합니다.
 */
export function base64UrlDecode(input: string): string {
  try {
    // Base64Url 표준 치환 (- -> +, _ -> /)
    let base64 = input.replace(/-/g, '+').replace(/_/g, '/');
    // 패딩(=) 보정
    while (base64.length % 4) {
      base64 += '=';
    }

    if (typeof atob === 'function') {
      const rawBinary = atob(base64);
      // UTF-8 멀티바이트 문자 복원
      const bytes = new Uint8Array(rawBinary.length);
      for (let i = 0; i < rawBinary.length; i++) {
        bytes[i] = rawBinary.charCodeAt(i);
      }
      return new TextDecoder().decode(bytes);
    } else {
      // Node.js 환경 대비
      return Buffer.from(base64, 'base64').toString('utf-8');
    }
  } catch (err) {
    throw new Error(`Base64 디코딩 실패: ${(err as Error).message}`);
  }
}

/**
 * JWT 토큰 문자열을 파싱하여 Header, Payload, Signature로 분리 및 디코딩합니다.
 */
export function decodeJwt(token: string): { success: true; data: DecodedJwt } | { success: false; error: string } {
  try {
    const trimmed = token.trim();
    if (!trimmed) {
      return { success: false, error: '토큰 문자열이 비어있습니다.' };
    }

    const parts = trimmed.split('.');
    if (parts.length !== 3) {
      return {
        success: false,
        error: `올바른 JWT 형식이 아닙니다 (3개 구역 필요, 현재 ${parts.length}개).`,
      };
    }

    const [headerB64, payloadB64, signatureB64] = parts;

    // Header 디코딩
    const headerStr = base64UrlDecode(headerB64);
    let headerObj: JwtHeader = {};
    try {
      headerObj = JSON.parse(headerStr);
    } catch {
      return { success: false, error: 'Header JSON 형식이 올바르지 않습니다.' };
    }

    // Payload 디코딩
    const payloadStr = base64UrlDecode(payloadB64);
    let payloadObj: JwtPayload = {};
    try {
      payloadObj = JSON.parse(payloadStr);
    } catch {
      return { success: false, error: 'Payload JSON 형식이 올바르지 않습니다.' };
    }

    return {
      success: true,
      data: {
        header: headerObj,
        payload: payloadObj,
        rawHeader: headerB64,
        rawPayload: payloadB64,
        signature: signatureB64,
        headerJson: JSON.stringify(headerObj, null, 2),
        payloadJson: JSON.stringify(payloadObj, null, 2),
      },
    };
  } catch (err) {
    return {
      success: false,
      error: (err as Error).message || '토큰 디코딩 중 오류가 발생했습니다.',
    };
  }
}

/**
 * 초 단위 UNIX 타임스탬프를 사용자의 로컬 타임존 날짜/시간 문자열로 포맷팅합니다.
 */
export function formatUnixTimestamp(unixSeconds: number): string {
  try {
    if (!unixSeconds || isNaN(unixSeconds)) return '-';
    const date = new Date(unixSeconds * 1000);
    if (isNaN(date.getTime())) return '-';

    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');

    return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
  } catch (err) {
    console.error('타임스탬프 변환 오류:', err);
    return '-';
  }
}

/**
 * 기준 시각 대비 상대 시간 텍스트를 반환합니다. (예: "30분 전", "2시간 남음")
 */
export function getRelativeTimeText(unixSeconds: number, nowSeconds: number = Math.floor(Date.now() / 1000)): string {
  try {
    const diff = unixSeconds - nowSeconds;
    const absDiff = Math.abs(diff);

    const minutes = Math.floor(absDiff / 60);
    const hours = Math.floor(absDiff / 3600);
    const days = Math.floor(absDiff / 86400);

    let unitText = '';
    if (days > 0) {
      unitText = `${days}일`;
    } else if (hours > 0) {
      unitText = `${hours}시간`;
    } else if (minutes > 0) {
      unitText = `${minutes}분`;
    } else {
      unitText = `${absDiff}초`;
    }

    return diff >= 0 ? `${unitText} 후` : `${unitText} 전`;
  } catch (err) {
    console.error('상대 시간 계산 오류:', err);
    return '';
  }
}

/**
 * JWT Payload의 만료(exp), 발급(iat), 유효 시작(nbf) 시간을 기반으로 토큰 상태를 평가합니다.
 */
export function evaluateTokenStatus(payload: JwtPayload, nowSeconds: number = Math.floor(Date.now() / 1000)): TokenStatusInfo {
  try {
    const exp = typeof payload.exp === 'number' ? payload.exp : undefined;
    const iat = typeof payload.iat === 'number' ? payload.iat : undefined;
    const nbf = typeof payload.nbf === 'number' ? payload.nbf : undefined;

    let issuedAtText: string | undefined;
    if (iat) {
      issuedAtText = `${formatUnixTimestamp(iat)} (${getRelativeTimeText(iat, nowSeconds)})`;
    }

    let notBeforeText: string | undefined;
    if (nbf) {
      notBeforeText = `${formatUnixTimestamp(nbf)} (${getRelativeTimeText(nbf, nowSeconds)})`;
    }

    if (nbf && nowSeconds < nbf) {
      return {
        status: 'future',
        message: '토큰이 아직 활성화되지 않았습니다 (Not Before 제한).',
        isExpired: false,
        issuedAtText,
        notBeforeText,
      };
    }

    if (exp) {
      const isExpired = nowSeconds >= exp;
      const expiresInText = `${formatUnixTimestamp(exp)} (${isExpired ? '만료됨' : '유효함'}, ${getRelativeTimeText(exp, nowSeconds)})`;

      if (isExpired) {
        return {
          status: 'expired',
          message: `토큰이 만료되었습니다 (${getRelativeTimeText(exp, nowSeconds)}).`,
          isExpired: true,
          expiresInText,
          issuedAtText,
          notBeforeText,
        };
      }

      return {
        status: 'valid',
        message: `유효한 토큰입니다 (만료까지 ${getRelativeTimeText(exp, nowSeconds)}).`,
        isExpired: false,
        expiresInText,
        issuedAtText,
        notBeforeText,
      };
    }

    return {
      status: 'valid',
      message: '만료 시간(exp)이 설정되지 않은 영구 토큰입니다.',
      isExpired: false,
      issuedAtText,
      notBeforeText,
    };
  } catch (err) {
    console.error('토큰 상태 평가 오류:', err);
    return {
      status: 'malformed',
      message: '토큰 상태를 판별할 수 없습니다.',
      isExpired: false,
    };
  }
}

/**
 * Web Crypto API를 활용하여 HMAC (HS256, HS384, HS512) 서명을 검증합니다.
 */
export async function verifyHmacSignature(
  token: string,
  secretKey: string
): Promise<{ verified: boolean; error?: string }> {
  try {
    const parts = token.trim().split('.');
    if (parts.length !== 3) {
      return { verified: false, error: '유효한 3단 구조의 JWT가 아닙니다.' };
    }

    const [headerB64, payloadB64, signatureB64] = parts;
    const headerStr = base64UrlDecode(headerB64);
    const header = JSON.parse(headerStr);
    const alg = (header.alg || 'HS256').toUpperCase();

    if (!alg.startsWith('HS')) {
      return {
        verified: false,
        error: `현재 HMAC 알고리즘(HS256, HS384, HS512)만 클라이언트 직접 검증을 지원합니다. (현재 알고리즘: ${alg})`,
      };
    }

    let hashName = 'SHA-256';
    if (alg === 'HS384') hashName = 'SHA-384';
    if (alg === 'HS512') hashName = 'SHA-512';

    if (!secretKey) {
      return { verified: false, error: '서명을 검증하기 위한 비밀키(Secret)를 입력해 주세요.' };
    }

    // crypto.subtle 지원 여부 확인
    const cryptoObj = typeof window !== 'undefined' ? window.crypto : (globalThis as unknown as { crypto: Crypto }).crypto;
    if (!cryptoObj || !cryptoObj.subtle) {
      return { verified: false, error: 'Web Crypto API를 지원하지 않는 환경입니다.' };
    }

    const encoder = new TextEncoder();
    const keyData = encoder.encode(secretKey);

    const cryptoKey = await cryptoObj.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: { name: hashName } },
      false,
      ['sign', 'verify']
    );

    const dataToVerify = encoder.encode(`${headerB64}.${payloadB64}`);

    // Base64Url 시그니처를 Uint8Array 바이너리로 변환
    let sigBase64 = signatureB64.replace(/-/g, '+').replace(/_/g, '/');
    while (sigBase64.length % 4) {
      sigBase64 += '=';
    }

    let rawSig: string;
    if (typeof atob === 'function') {
      rawSig = atob(sigBase64);
    } else {
      rawSig = Buffer.from(sigBase64, 'base64').toString('binary');
    }

    const sigBytes = new Uint8Array(rawSig.length);
    for (let i = 0; i < rawSig.length; i++) {
      sigBytes[i] = rawSig.charCodeAt(i);
    }

    const isValid = await cryptoObj.subtle.verify(
      'HMAC',
      cryptoKey,
      sigBytes,
      dataToVerify
    );

    return { verified: isValid };
  } catch (err) {
    return {
      verified: false,
      error: `서명 검증 중 오류 발생: ${(err as Error).message}`,
    };
  }
}

/**
 * 사전 제공 샘플 JWT 토큰 목록 (프리셋)
 */
export const JWT_SAMPLE_PRESETS = [
  {
    id: 'standard',
    name: '표준 유효 토큰 (HS256)',
    description: '일반적인 웹 서비스의 인증 토큰 예시 (만료 기한 2030년)',
    secret: 'my-super-secret-key-12345',
    // Header: {"alg":"HS256","typ":"JWT"}
    // Payload: {"sub":"user_891234","name":"Kim Dev","role":"admin","iat":1700000000,"exp":1900000000}
    // Signed with 'my-super-secret-key-12345'
    token:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyXzg5MTIzNCIsIm5hbWUiOiJLaW0gRGV2Iiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzAwMDAwMDAwLCJleHAiOjE5MDAwMDAwMDB9.s165L6B3Qh5uX4q7b7Yp90Ld4Tswr8B0V5u6qY8yZc0',
  },
  {
    id: 'expired',
    name: '만료된 토큰 (Expired)',
    description: '이미 유효 기간이 만료된 토큰 검증 테스트용',
    secret: 'test-secret',
    // Header: {"alg":"HS256","typ":"JWT"}
    // Payload: {"sub":"user_123","email":"test@example.com","iat":1500000000,"exp":1500003600}
    token:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyXzEyMyIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsImlhdCI6MTUwMDAwMDAwMCwiZXhwIjoxNTAwMDAzNjAwfQ.JkE2q9F6rYy07k2U_qN3rK5Kx0q3nL4qR5w9e8a7b6c',
  },
  {
    id: 'roles',
    name: '권한 및 클레임 포함 토큰',
    description: '다양한 커스텀 클레임 및 세부 메타데이터가 담긴 토큰',
    secret: 'jwt-auth-secret-key',
    // Header: {"alg":"HS256","typ":"JWT","kid":"auth-key-v1"}
    // Payload: {"iss":"auth.xitora.cc","sub":"developer_99","permissions":["read:posts","write:tools","admin"],"profile":{"level":99,"tier":"VIP"},"iat":1710000000,"exp":2100000000}
    token:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImF1dGgta2V5LXYxIn0.eyJpc3MiOiJhdXRoLnhpdG9yYS5jYyIsInN1YiI6ImRldmVsb3Blcl85OSIsInBlcm1pc3Npb25zIjpbInJlYWQ6cG9zdHMiLCJ3cml0ZTp0b29scyIsImFkbWluIl0sInByb2ZpbGUiOnsibGV2ZWwiOjk5LCJ0aWVyIjoiVklQIn0sImlhdCI6MTcxMDAwMDAwMCwiZXhwIjoyMTAwMDAwMDAwfQ.g8T5q2Q1j4b8Y1n5k9L0v3C7x6Z4m2W1e9R8t7Y6u5I',
  },
];
