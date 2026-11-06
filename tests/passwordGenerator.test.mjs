import test from "node:test";
import assert from "node:assert/strict";
import {
  generateRandomPassword,
  generatePassphrase,
  generatePin,
  evaluatePasswordStrength
} from "../src/utils/passwordGenerator.ts";

test("generateRandomPassword: 길이 및 문자 조합 포함 검증", () => {
  const pwd = generateRandomPassword({
    length: 20,
    useUpper: true,
    useLower: true,
    useDigits: true,
    useSymbols: true,
    excludeAmbiguous: false
  });

  assert.equal(pwd.length, 20);
  assert.ok(/[A-Z]/.test(pwd), "대문자가 포함되어야 함");
  assert.ok(/[a-z]/.test(pwd), "소문자가 포함되어야 함");
  assert.ok(/[0-9]/.test(pwd), "숫자가 포함되어야 함");
  assert.ok(/[^a-zA-Z0-9]/.test(pwd), "특수문자가 포함되어야 함");
});

test("generateRandomPassword: 헷갈리는 문자(1, l, I, 0, O) 제외 옵션 검증", () => {
  for (let i = 0; i < 20; i++) {
    const pwd = generateRandomPassword({
      length: 32,
      useUpper: true,
      useLower: true,
      useDigits: true,
      useSymbols: false,
      excludeAmbiguous: true
    });

    assert.equal(/[1lI0Oo|]/.test(pwd), false, "헷갈리는 문자가 포함되지 않아야 함");
  }
});

test("generatePassphrase: 단어 수 및 구분자 검증", () => {
  const pass = generatePassphrase({
    wordCount: 4,
    separator: "-",
    capitalize: true,
    includeNumber: false
  });

  const parts = pass.split("-");
  assert.equal(parts.length, 4);
  for (const part of parts) {
    assert.ok(part.length > 0);
    assert.equal(part[0], part[0].toUpperCase(), "첫 글자가 대문자여야 함");
  }
});

test("generatePin: 숫자 PIN 생성 검증", () => {
  const pin6 = generatePin(6);
  assert.equal(pin6.length, 6);
  assert.equal(/^\d{6}$/.test(pin6), true);

  const pin4 = generatePin(4);
  assert.equal(pin4.length, 4);
  assert.equal(/^\d{4}$/.test(pin4), true);
});

test("evaluatePasswordStrength: 엔트로피 및 강도 평가 검증", () => {
  const empty = evaluatePasswordStrength("");
  assert.equal(empty.score, 0);
  assert.equal(empty.label, "입력 대기");
  assert.equal(empty.entropyBits, 0);

  const weak = evaluatePasswordStrength("12345");
  assert.equal(weak.score, 0);
  assert.equal(weak.label, "매우 취약");

  const medium = evaluatePasswordStrength("CorrectHorse99");
  assert.ok(medium.score >= 2);

  const ultraStrong = evaluatePasswordStrength("p$W9@xK2#mQ8!vL4%zN7&rT5");
  assert.equal(ultraStrong.score, 4);
  assert.equal(ultraStrong.label, "매우 강력");
  assert.ok(ultraStrong.entropyBits > 100);
});
