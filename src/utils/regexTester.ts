/**
 * 정규표현식(Regex) 테스트, 매칭 분석 및 코드 스니펫 생성 유틸리티
 */

export interface RegexMatchItem {
  index: number;
  length: number;
  match: string;
  groups: Array<{ name?: string; value: string; index: number }>;
}

export interface RegexExecutionResult {
  isValid: boolean;
  error: string | null;
  matches: RegexMatchItem[];
  matchCount: number;
  executionTimeMs: number;
  replacedText?: string;
}

export interface RegexPreset {
  id: string;
  name: string;
  description: string;
  category: "검증" | "추출" | "정제";
  pattern: string;
  flags: string;
  testText: string;
}

export interface RegexCheatsheetItem {
  token: string;
  name: string;
  description: string;
  example: string;
}

/**
 * 실무에서 자주 사용되는 정규식 프리셋 목록
 */
export const REGEX_PRESETS: RegexPreset[] = [
  {
    id: "email",
    name: "이메일 유효성 검사",
    description: "표준 이메일 주소 형식 검증",
    category: "검증",
    pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
    flags: "gm",
    testText: "contact@example.com\ninvalid-email@\ntest.user+tag@domain.co.kr\nuser@sub.domain.org"
  },
  {
    id: "kr-phone",
    name: "한국 휴대폰 번호",
    description: "010/011 등의 하이픈 포함 또는 미포함 번호",
    category: "추출",
    pattern: "01[016789]-?[0-9]{3,4}-?[0-9]{4}",
    flags: "g",
    testText: "홍길동: 010-1234-5678\n김철수: 01098765432\n비정상 번호: 02-123-4567, 010-123-456"
  },
  {
    id: "password-complex",
    name: "비밀번호 복잡도 검사",
    description: "영문, 숫자, 특수문자 포함 8자 이상 20자 이하",
    category: "검증",
    pattern: "^(?=.*[A-Za-z])(?=.*\\d)(?=.*[@$!%*#?&])[A-Za-z\\d@$!%*#?&]{8,20}$",
    flags: "gm",
    testText: "Passw0rd!123\nsimplepw\nNoSpecialChar123\nSuper#Secure99"
  },
  {
    id: "url",
    name: "URL 및 웹 링크 추출",
    description: "http / https 프로토콜을 포함한 웹 URL 감지",
    category: "추출",
    pattern: "https?:\\/\\/(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b([-a-zA-Z0-9()@:%_\\+.~#?&//=]*)",
    flags: "gi",
    testText: "방문 링크: https://github.com/xitora 및 http://example.com/test?q=search#top 확인 요망"
  },
  {
    id: "date-iso",
    name: "날짜 형식 (YYYY-MM-DD)",
    description: "연도-월-일 또는 연도.월.일 형식 감지",
    category: "추출",
    pattern: "\\b(\\d{4})[-./](\\d{2})[-./](\\d{2})\\b",
    flags: "g",
    testText: "생성일자: 2026-10-10, 마감일자: 2026.12.31, 오류일자: 26-1-1"
  },
  {
    id: "ipv4",
    name: "IPv4 주소",
    description: "0.0.0.0 ~ 255.255.255.255 IP 주소 감지",
    category: "검증",
    pattern: "\\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\b",
    flags: "g",
    testText: "접속 서버: 192.168.0.1, 로컬: 127.0.0.1, 잘못된 IP: 999.12.34.56"
  },
  {
    id: "html-tags",
    name: "HTML 태그 제거 / 감지",
    description: "여는 태그와 닫는 태그를 매칭하여 태그 제거에 활용",
    category: "정제",
    pattern: "<(\\/?[a-zA-Z0-9]+)(?:\\s+[^>]*?)?\\/?>",
    flags: "g",
    testText: "<div class=\"hero\"><h1>제목입니다</h1><p>본문 내용 <a href=\"#\">링크</a></p></div>"
  },
  {
    id: "korean-only",
    name: "한글 전용 텍스트",
    description: "초성, 중성, 완성형 한글 음절 추출",
    category: "추출",
    pattern: "[가-힣]+",
    flags: "g",
    testText: "Hello 안녕! 정규식 Tester 도구 123입니다."
  }
];

/**
 * 정규식 문법 빠른 참조 치트시트 데이터
 */
export const REGEX_CHEATSHEET: { category: string; items: RegexCheatsheetItem[] }[] = [
  {
    category: "문자 클래스",
    items: [
      { token: "\\d", name: "숫자", description: "[0-9]와 동일", example: "3" },
      { token: "\\D", name: "비숫자", description: "[^0-9]와 동일", example: "A, !" },
      { token: "\\w", name: "단어 문자", description: "영문 대소문자, 숫자, 밑줄(_)", example: "word_1" },
      { token: "\\W", name: "비단어 문자", description: "특수문자 및 공백", example: "@, 공백" },
      { token: "\\s", name: "공백 문자", description: "띄어쓰기, 탭, 줄바꿈", example: "' '" },
      { token: ".", name: "모든 문자", description: "줄바꿈을 제외한 임의의 한 문자", example: "a, 1, @" }
    ]
  },
  {
    category: "수량자 (Quantifiers)",
    items: [
      { token: "*", name: "0회 이상", description: "{0,}과 동일 (없거나 많음)", example: "ab*" },
      { token: "+", name: "1회 이상", description: "{1,}과 동일 (최소 1개)", example: "ab+" },
      { token: "?", name: "0회 또는 1회", description: "{0,1}과 동일 (선택적)", example: "colou?r" },
      { token: "{n,m}", name: "n회 이상 m회 이하", description: "반복 횟수 범위 지정", example: "\\d{2,4}" }
    ]
  },
  {
    category: "앵커 및 경계 (Anchors)",
    items: [
      { token: "^", name: "문자열 시작", description: "행 또는 문자열의 첫 부분", example: "^Hello" },
      { token: "$", name: "문자열 끝", description: "행 또는 문자열의 마지막", example: "world$" },
      { token: "\\b", name: "단어 경계", description: "단어의 시작 또는 끝", example: "\\bcat\\b" }
    ]
  },
  {
    category: "그룹 및 전방 탐색",
    items: [
      { token: "(abc)", name: "캡처 그룹", description: "그룹화 및 결과 캡처", example: "(\\d{3})" },
      { token: "(?:abc)", name: "비캡처 그룹", description: "그룹화하되 캡처하지 않음", example: "(?:abc)" },
      { token: "(?=abc)", name: "긍정 룩어헤드", description: "뒤에 abc가 따라붙는 위치", example: "\\d+(?=px)" },
      { token: "(?!abc)", name: "부정 룩어헤드", description: "뒤에 abc가 없는 위치", example: "\\d+(?!px)" }
    ]
  }
];

/**
 * 정규표현식 매칭을 안전하게 실행하고 결과 및 소요시간을 반환합니다.
 */
export function executeRegexAnalysis(
  pattern: string,
  flags: string,
  testText: string,
  replacePattern?: string
): RegexExecutionResult {
  const startTime = performance.now();

  if (!pattern) {
    return {
      isValid: true,
      error: null,
      matches: [],
      matchCount: 0,
      executionTimeMs: 0,
      replacedText: testText
    };
  }

  try {
    // 1. RegExp 인스턴스 생성
    const regex = new RegExp(pattern, flags);
    const matches: RegexMatchItem[] = [];

    // 전역 플래그(g)가 없는 경우 1회만 검색
    if (!flags.includes("g")) {
      const match = regex.exec(testText);
      if (match) {
        const groups: Array<{ name?: string; value: string; index: number }> = [];
        if (match.length > 1) {
          for (let i = 1; i < match.length; i++) {
            groups.push({
              value: match[i] || "",
              index: i
            });
          }
        }
        matches.push({
          index: match.index,
          length: match[0].length,
          match: match[0],
          groups
        });
      }
    } else {
      // 전역 플래그(g)가 있는 경우 반복 실행
      let match: RegExpExecArray | null;
      let loopCount = 0;
      const MAX_LOOPS = 5000; // 브라우저 무한 루프/ReDoS 방어 상한선

      while ((match = regex.exec(testText)) !== null) {
        loopCount++;
        if (loopCount > MAX_LOOPS) {
          throw new Error("매칭 결과가 너무 많아 안전을 위해 5,000건에서 중단되었습니다.");
        }

        const groups: Array<{ name?: string; value: string; index: number }> = [];
        if (match.length > 1) {
          for (let i = 1; i < match.length; i++) {
            groups.push({
              value: match[i] || "",
              index: i
            });
          }
        }

        matches.push({
          index: match.index,
          length: match[0].length,
          match: match[0],
          groups
        });

        // 0길이 매칭(예: /a*/, /^/) 무한 루프 방지
        if (match[0].length === 0) {
          regex.lastIndex++;
          if (regex.lastIndex > testText.length) break;
        }
      }
    }

    // 치환 실행 (옵션)
    let replacedText: string | undefined = undefined;
    if (typeof replacePattern === "string") {
      try {
        const replaceRegex = new RegExp(pattern, flags);
        replacedText = testText.replace(replaceRegex, replacePattern);
      } catch (err) {
        console.error("치환 중 오류:", err);
      }
    }

    const executionTimeMs = performance.now() - startTime;

    return {
      isValid: true,
      error: null,
      matches,
      matchCount: matches.length,
      executionTimeMs: Number(executionTimeMs.toFixed(2)),
      replacedText
    };
  } catch (error: any) {
    const executionTimeMs = performance.now() - startTime;
    return {
      isValid: false,
      error: error.message || "유효하지 않은 정규식 구문입니다.",
      matches: [],
      matchCount: 0,
      executionTimeMs: Number(executionTimeMs.toFixed(2)),
      replacedText: testText
    };
  }
}

/**
 * 프로그래밍 언어별 정규식 사용 예제 코드 스니펫 생성
 */
export function generateRegexCodeSnippet(
  pattern: string,
  flags: string,
  language: "javascript" | "python" | "go" | "java" | "php"
): string {
  const safePattern = pattern.replace(/\\/g, "\\\\");

  switch (language) {
    case "javascript":
      return `// JavaScript / TypeScript
const regex = /${pattern}/${flags};
const text = "테스트 문자열";

// 1. 단순 일치 여부 확인
const isMatch = regex.test(text);

// 2. 모든 매칭 추출
const matches = [...text.matchAll(new RegExp("${safePattern}", "${flags}"))];
for (const match of matches) {
  console.log("매치:", match[0], "위치:", match.index);
}`;

    case "python":
      return `# Python 3
import re

pattern = r"${pattern}"
text = "테스트 문자열"

# 1. 일치 여부 검색
match = re.search(pattern, text)
if match:
    print("발견:", match.group())

# 2. 모든 매칭 검색
matches = re.findall(pattern, text)
print("전체 매칭 목록:", matches)`;

    case "go":
      return `// Go
package main

import (
    "fmt"
    "regexp"
)

func main() {
    re := regexp.MustCompile(\`${pattern}\`)
    text := "테스트 문자열"

    // 일치 여부
    fmt.Println(re.MatchString(text))

    // 모든 매칭 추출
    matches := re.FindAllString(text, -1)
    fmt.Println(matches)
}`;

    case "java":
      return `// Java
import java.util.regex.*;

public class RegexExample {
    public static void main(String[] args) {
        String patternStr = "${safePattern}";
        Pattern pattern = Pattern.compile(patternStr);
        String text = "테스트 문자열";

        Matcher matcher = pattern.matcher(text);
        while (matcher.find()) {
            System.out.println("매치: " + matcher.group() + " (" + matcher.start() + ")");
        }
    }
}`;

    case "php":
      return `<?php
// PHP
$pattern = '/${pattern}/${flags}';
$text = '테스트 문자열';

if (preg_match_all($pattern, $text, $matches)) {
    print_r($matches[0]);
}
?>`;

    default:
      return "";
  }
}
