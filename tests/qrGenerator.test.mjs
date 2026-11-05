import test from "node:test";
import assert from "node:assert/strict";
import {
  buildWifiPayload,
  buildVCardPayload,
  buildEmailPayload,
  buildSmsPayload,
  getContrastRatio,
  generateQrSvgString
} from "../src/utils/qrGenerator.ts";

test("buildWifiPayload: Wi-Fi 접속 정보 페이로드 포맷 검증", () => {
  // 1. 기본 WPA
  const wpa = buildWifiPayload({ ssid: "HomeNet", password: "mypassword123", encryption: "WPA" });
  assert.equal(wpa, "WIFI:T:WPA;S:HomeNet;P:mypassword123;;");

  // 2. 비암호화(nopass)
  const open = buildWifiPayload({ ssid: "Cafe_Free", encryption: "nopass" });
  assert.equal(open, "WIFI:T:nopass;S:Cafe_Free;;");

  // 3. 히든 네트워크 및 특수문자 이스케이프
  const hidden = buildWifiPayload({
    ssid: "Office;WiFi",
    password: "pass:word;1",
    encryption: "WPA",
    hidden: true
  });
  assert.equal(hidden, "WIFI:T:WPA;S:Office\\;WiFi;P:pass\\:word\\;1;H:true;;");

  // 4. 빈 SSID 방어 로직
  assert.equal(buildWifiPayload({ ssid: "   " }), "");
});

test("buildVCardPayload: 명함 정보 표준 형식 검증", () => {
  const vcard = buildVCardPayload({
    name: "홍길동",
    phone: "010-1234-5678",
    email: "gildong@example.com",
    organization: "주식회사 한국",
    title: "수석 연구원"
  });

  assert.ok(vcard.startsWith("BEGIN:VCARD"));
  assert.ok(vcard.includes("FN:홍길동"));
  assert.ok(vcard.includes("TEL;TYPE=CELL:010-1234-5678"));
  assert.ok(vcard.includes("EMAIL:gildong@example.com"));
  assert.ok(vcard.includes("ORG:주식회사 한국"));
  assert.ok(vcard.includes("TITLE:수석 연구원"));
  assert.ok(vcard.endsWith("END:VCARD"));

  // 빈 이름 방어
  assert.equal(buildVCardPayload({ name: "" }), "");
});

test("buildEmailPayload: mailto 스키마 URL 검증", () => {
  const mail = buildEmailPayload({
    to: "test@example.com",
    subject: "문의사항",
    body: "안녕하세요. 문의드립니다."
  });

  assert.ok(mail.startsWith("mailto:test%40example.com?"));
  assert.ok(mail.includes("subject=%EB%AC%B8%EC%9D%98%EC%82%AC%ED%95%AD"));
  assert.ok(mail.includes("body="));

  // 빈 수신인 방어
  assert.equal(buildEmailPayload({ to: "" }), "");
});

test("buildSmsPayload: 메시지가 없어도 문자 앱 URI 유지", () => {
  const sms = buildSmsPayload({ phone: "010-9876-5432", message: "도착했습니다" });
  assert.equal(sms, "smsto:01098765432:도착했습니다");

  const callOnly = buildSmsPayload({ phone: "010-9876-5432" });
  assert.equal(callOnly, "smsto:01098765432:");

  assert.equal(buildSmsPayload({ phone: "" }), "");
});

test("getContrastRatio: 명도 대비 계산 검증", () => {
  const blackAndWhite = getContrastRatio("#000000", "#ffffff");
  assert.ok(blackAndWhite > 20, "검정과 흰색의 대비율은 20 이상이어야 함");

  const same = getContrastRatio("#123456", "#123456");
  assert.equal(Math.round(same), 1, "동일한 색상의 대비율은 1이어야 함");
});

test("generateQrSvgString: SVG 문자열 생성 검증", async () => {
  const svg = await generateQrSvgString({
    text: "https://example.com",
    errorCorrectionLevel: "M",
    fgColor: "#000000",
    bgColor: "#ffffff",
    margin: 2
  });

  assert.ok(svg.includes("<svg"), "결과에 svg 태그가 포함되어야 함");
  assert.ok(svg.includes("path") || svg.includes("rect"), "SVG 내부에 벡터 요소가 있어야 함");
});
