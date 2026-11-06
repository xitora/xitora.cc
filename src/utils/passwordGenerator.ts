/**
 * 암호학적으로 안전한(Cryptographically Secure) 비밀번호 생성 및 엔트로피 분석 유틸리티
 */

export interface PasswordGeneratorOptions {
  length: number;
  useUpper: boolean;
  useLower: boolean;
  useDigits: boolean;
  useSymbols: boolean;
  excludeAmbiguous: boolean; // 1, l, I, 0, O, o 제외
}

export interface PassphraseOptions {
  wordCount: number;
  separator: string;
  capitalize: boolean;
  includeNumber: boolean;
}

export interface PasswordStrength {
  score: number; // 0 ~ 4 (매우 취약 ~ 매우 안전)
  label: "입력 대기" | "매우 취약" | "취약" | "보통" | "안전" | "매우 강력";
  color: string;
  entropyBits: number;
  crackTimeEstimate: string;
}

// 헷갈리기 쉬운 문자 집합
const AMBIGUOUS_CHARS = new Set(["1", "l", "I", "|", "0", "O", "o"]);

const UPPERCASE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LOWERCASE_CHARS = "abcdefghijklmnopqrstuvwxyz";
const DIGIT_CHARS = "0123456789";
const SYMBOL_CHARS = "!@#$%^&*()_+-=[]{}|;:,.<>?";

// 기억하기 쉬운 Diceware 단어장 (영문 및 의미 있는 짧은 단어들)
export const DICEWARE_WORDLIST = [
  "apple", "banana", "galaxy", "orbit", "rocket", "forest", "harbor", "shadow", "silver", "planet",
  "falcon", "breeze", "beacon", "castle", "canyon", "desert", "echo", "flame", "glacier", "island",
  "jungle", "lagoon", "meadow", "nebula", "oasis", "pulsar", "quartz", "river", "summit", "thunder",
  "valley", "vortex", "winter", "zenith", "aurora", "comet", "dynamo", "ember", "frost", "gravity",
  "horizon", "impact", "journey", "kinetic", "lunar", "meteor", "nexus", "ocean", "pioneer", "quantum",
  "radar", "solar", "timber", "ultra", "vector", "wave", "yield", "alpha", "bravo", "delta"
];

/**
 * crypto.getRandomValues를 사용한 균일 난수 정수 생성 (0 <= result < max)
 */
function getSecureRandomInt(max: number): number {
  if (max <= 1) return 0;
  // 바이어스(bias)를 방지하기 위한 Rejection Sampling
  const maxUint32 = 0xffffffff;
  const limit = maxUint32 - (maxUint32 % max);
  const buffer = new Uint32Array(1);

  while (true) {
    crypto.getRandomValues(buffer);
    if (buffer[0] < limit) {
      return buffer[0] % max;
    }
  }
}

/**
 * 암호학적으로 안전한 무작위 문자열 비밀번호를 생성합니다.
 */
export function generateRandomPassword(options: PasswordGeneratorOptions): string {
  const {
    length = 16,
    useUpper = true,
    useLower = true,
    useDigits = true,
    useSymbols = true,
    excludeAmbiguous = false
  } = options;

  let pool = "";
  const guaranteedChars: string[] = [];

  const filterPool = (chars: string) => {
    if (!excludeAmbiguous) return chars;
    return chars
      .split("")
      .filter((c) => !AMBIGUOUS_CHARS.has(c))
      .join("");
  };

  if (useUpper) {
    const p = filterPool(UPPERCASE_CHARS);
    if (p.length > 0) {
      pool += p;
      guaranteedChars.push(p[getSecureRandomInt(p.length)]);
    }
  }

  if (useLower) {
    const p = filterPool(LOWERCASE_CHARS);
    if (p.length > 0) {
      pool += p;
      guaranteedChars.push(p[getSecureRandomInt(p.length)]);
    }
  }

  if (useDigits) {
    const p = filterPool(DIGIT_CHARS);
    if (p.length > 0) {
      pool += p;
      guaranteedChars.push(p[getSecureRandomInt(p.length)]);
    }
  }

  if (useSymbols) {
    const p = filterPool(SYMBOL_CHARS);
    if (p.length > 0) {
      pool += p;
      guaranteedChars.push(p[getSecureRandomInt(p.length)]);
    }
  }

  if (pool.length === 0) {
    pool = filterPool(LOWERCASE_CHARS + DIGIT_CHARS);
  }

  const result: string[] = [...guaranteedChars];
  const targetLength = Math.max(result.length, length);

  while (result.length < targetLength) {
    const idx = getSecureRandomInt(pool.length);
    result.push(pool[idx]);
  }

  // 생성된 문자 배열 Fisher-Yates 셔플
  for (let i = result.length - 1; i > 0; i--) {
    const j = getSecureRandomInt(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result.join("");
}

/**
 * Diceware 방식의 기억하기 쉬운 단어 조합 암호문(Passphrase)을 생성합니다.
 */
export function generatePassphrase(options: PassphraseOptions): string {
  const {
    wordCount = 4,
    separator = "-",
    capitalize = true,
    includeNumber = true
  } = options;

  const words: string[] = [];
  for (let i = 0; i < wordCount; i++) {
    const idx = getSecureRandomInt(DICEWARE_WORDLIST.length);
    let word = DICEWARE_WORDLIST[idx];
    if (capitalize) {
      word = word.charAt(0).toUpperCase() + word.slice(1);
    }
    words.push(word);
  }

  if (includeNumber) {
    const num = getSecureRandomInt(100);
    const insertIdx = getSecureRandomInt(words.length);
    words[insertIdx] = `${words[insertIdx]}${num}`;
  }

  return words.join(separator);
}

/**
 * 숫자 전용 PIN 번호를 생성합니다.
 */
export function generatePin(length = 6): string {
  const digits: string[] = [];
  for (let i = 0; i < length; i++) {
    digits.push(getSecureRandomInt(10).toString());
  }
  return digits.join("");
}

/**
 * 비밀번호의 정보 엔트로피(Bits)와 Brute-Force 무차별 대입 해독 예상 시간을 계산합니다.
 */
export function evaluatePasswordStrength(password: string): PasswordStrength {
  if (!password || password.length === 0) {
    return {
      score: 0,
      label: "입력 대기",
      color: "#71717a",
      entropyBits: 0,
      crackTimeEstimate: "입력 대기"
    };
  }

  // 문자 집합 풀 크기 추정
  let poolSize = 0;
  if (/[a-z]/.test(password)) poolSize += 26;
  if (/[A-Z]/.test(password)) poolSize += 26;
  if (/[0-9]/.test(password)) poolSize += 10;
  if (/[^a-zA-Z0-9]/.test(password)) poolSize += 33;

  if (poolSize === 0) poolSize = 10;

  // 섀넌 엔트로피 공식: E = L * log2(poolSize)
  const words = password.toLowerCase().split(/[-_ .]+/);
  const isKnownPassphrase = words.length > 1 && words.every(word => DICEWARE_WORDLIST.includes(word.replace(/\d+$/, '')));
  const phraseBits = words.length * Math.log2(DICEWARE_WORDLIST.length) + (/\d/.test(password) ? Math.log2(100 * words.length) : 0);
  const entropyBits = Math.floor(isKnownPassphrase ? phraseBits : password.length * Math.log2(poolSize));

  // 초당 100억 회(10^10) 연산 가능한 공격자 기준 소요 시간 추정
  const guessesPerSecond = 1e10;
  const totalCombinations = Math.pow(2, entropyBits);
  const secondsToCrack = totalCombinations / (2 * guessesPerSecond);

  let crackTimeEstimate = "즉시";
  if (secondsToCrack < 1) {
    crackTimeEstimate = "1초 미만";
  } else if (secondsToCrack < 60) {
    crackTimeEstimate = `${Math.round(secondsToCrack)}초`;
  } else if (secondsToCrack < 3600) {
    crackTimeEstimate = `${Math.round(secondsToCrack / 60)}분`;
  } else if (secondsToCrack < 86400) {
    crackTimeEstimate = `${Math.round(secondsToCrack / 3600)}시간`;
  } else if (secondsToCrack < 31536000) {
    crackTimeEstimate = `${Math.round(secondsToCrack / 86400)}일`;
  } else if (secondsToCrack < 31536000 * 100) {
    crackTimeEstimate = `${Math.round(secondsToCrack / 31536000)}년`;
  } else if (secondsToCrack < 31536000 * 1e6) {
    crackTimeEstimate = "수천 년";
  } else {
    crackTimeEstimate = "수억 년 이상";
  }

  // 점수 산정 (엔트로피 비트 기준)
  let score = 0;
  let label: PasswordStrength["label"] = "매우 취약";
  let color = "#ef4444";

  if (entropyBits < 36) {
    score = 0;
    label = "매우 취약";
    color = "#ef4444";
  } else if (entropyBits < 56) {
    score = 1;
    label = "취약";
    color = "#f97316";
  } else if (entropyBits < 72) {
    score = 2;
    label = "보통";
    color = "#eab308";
  } else if (entropyBits < 96) {
    score = 3;
    label = "안전";
    color = "#22c55e";
  } else {
    score = 4;
    label = "매우 강력";
    color = "#38bdf8";
  }

  return {
    score,
    label,
    color,
    entropyBits,
    crackTimeEstimate
  };
}
