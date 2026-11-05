import test from "node:test";
import assert from "node:assert/strict";
import {
  executeRegexAnalysis,
  generateRegexCodeSnippet,
  REGEX_PRESETS
} from "../src/utils/regexTester.ts";

test("executeRegexAnalysis: 다중 일치(global) 및 캡처 그룹 분석 검증", () => {
  const result = executeRegexAnalysis(
    "(\\w+)@(\\w+\\.\\w+)",
    "g",
    "이메일 1: test@domain.com 그리고 admin@xitora.cc"
  );

  assert.equal(result.isValid, true);
  assert.equal(result.error, null);
  assert.equal(result.matchCount, 2);
  assert.equal(result.matches[0].match, "test@domain.com");
  assert.equal(result.matches[0].groups.length, 2);
  assert.equal(result.matches[0].groups[0].value, "test");
  assert.equal(result.matches[0].groups[1].value, "domain.com");
  assert.equal(result.matches[1].match, "admin@xitora.cc");
});

test("executeRegexAnalysis: 단일 일치(non-global) 검증", () => {
  const result = executeRegexAnalysis(
    "\\d+",
    "",
    "사과 10개, 배 20개"
  );

  assert.equal(result.isValid, true);
  assert.equal(result.matchCount, 1);
  assert.equal(result.matches[0].match, "10");
});

test("executeRegexAnalysis: 정규식 문법 오류 시 방어 및 에러 메시지 반환", () => {
  const result = executeRegexAnalysis(
    "[a-z", // 닫히지 않은 괄호
    "g",
    "테스트 텍스트"
  );

  assert.equal(result.isValid, false);
  assert.notEqual(result.error, null);
  assert.equal(result.matchCount, 0);
});

test("executeRegexAnalysis: 치환(Substitution) 기능 검증", () => {
  const result = executeRegexAnalysis(
    "(\\d{3})-(\\d{4})-(\\d{4})",
    "g",
    "연락처는 010-1234-5678 입니다.",
    "$1-****-$3"
  );

  assert.equal(result.isValid, true);
  assert.equal(result.replacedText, "연락처는 010-****-5678 입니다.");
});

test("REGEX_PRESETS: 이메일 및 휴대폰 번호 프리셋 동작 검증", () => {
  const emailPreset = REGEX_PRESETS.find((p) => p.id === "email");
  assert.ok(emailPreset);
  const emailRegex = new RegExp(emailPreset.pattern, "m");
  assert.equal(emailRegex.test("user@example.com"), true);
  assert.equal(emailRegex.test("invalid-email@"), false);

  const phonePreset = REGEX_PRESETS.find((p) => p.id === "kr-phone");
  assert.ok(phonePreset);
  const phoneRegex = new RegExp(phonePreset.pattern);
  assert.equal(phoneRegex.test("010-9876-5432"), true);
  assert.equal(phoneRegex.test("01012345678"), true);
});

test("generateRegexCodeSnippet: 언어별 코드 스니펫 생성 검증", () => {
  const jsSnippet = generateRegexCodeSnippet("\\d+", "g", "javascript");
  assert.ok(jsSnippet.includes("const regex = /\\d+/g;"));

  const pySnippet = generateRegexCodeSnippet("\\d+", "g", "python");
  assert.ok(pySnippet.includes("import re"));
  assert.ok(pySnippet.includes("re.findall"));
});
