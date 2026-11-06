import puppeteer from "puppeteer";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { PDFDocument } from "pdf-lib";
import QRCode from "qrcode";
import { unzipSync, strFromU8 } from "fflate";
const base = process.env.BASE_URL || "http://127.0.0.1:4173";
const folder = await fs.mkdtemp(path.join(os.tmpdir(), "xitora-tools-"));
const browser = await puppeteer.launch({
  headless: true,
  args: [
    "--no-sandbox",
    "--use-fake-device-for-media-stream",
    "--use-fake-ui-for-media-stream",
  ],
});
const page = await browser.newPage();
await browser
  .defaultBrowserContext()
  .overridePermissions(new URL(base).origin, ["camera"]);
await page.setViewport({ width: 1440, height: 1000 });
const cdp = await page.createCDPSession();
await cdp.send("Browser.setDownloadBehavior", {
  behavior: "allow",
  downloadPath: folder,
});
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function go(id) {
  console.log("Checking", id);
  await page.goto(base + "/tools/" + id, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".ws-main");
}
async function click(text) {
  await page.evaluate((text) => {
    const button = Array.from(document.querySelectorAll(".ws button")).find(
      (b) => b.textContent.trim() === text,
    );
    if (!button) throw Error("Missing button: " + text);
    button.click();
  }, text);
}
async function field(label, value) {
  await page.evaluate(
    ({ label, value }) => {
      const wrapper = Array.from(document.querySelectorAll(".ws label")).find(
        (l) => l.querySelector("span")?.textContent === label,
      );
      const input = wrapper?.querySelector("input,select");
      if (!input) throw Error("Missing field: " + label);
      Object.getOwnPropertyDescriptor(
        input instanceof HTMLSelectElement
          ? HTMLSelectElement.prototype
          : HTMLInputElement.prototype,
        "value",
      ).set.call(input, String(value));
      input.dispatchEvent(
        new Event(input instanceof HTMLSelectElement ? "change" : "input", {
          bubbles: true,
        }),
      );
    },
    { label, value },
  );
}
async function editor(value, index = 0) {
  const inputs = await page.$$(".ws-editor");
  await inputs[index].evaluate((el, v) => {
    Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      "value",
    ).set.call(el, v);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }, value);
}
async function result(text) {
  await page.waitForFunction(
    (text) => document.querySelector(".ws-result")?.textContent.includes(text),
    { timeout: 12000 },
    text,
  );
}
async function upload(file) {
  const input = await page.$(".ws-drop input");
  await input.uploadFile(file);
}
async function downloaded(name) {
  for (let i = 0; i < 150; i++) {
    try {
      return await fs.readFile(path.join(folder, name));
    } catch {
      await wait(100);
    }
  }
  throw Error("Download missing: " + name);
}
async function status(text = "완료했습니다.") {
  await page.waitForFunction(
    (text) =>
      Array.from(document.querySelectorAll("[role=status]")).some((el) =>
        el.textContent.includes(text),
      ),
    { timeout: 20000 },
    text,
  );
}
try {
  await go("text");
  await editor("  a  \n\n\n b ");
  await result("a\n\nb");
  await field("작업", "찾아 바꾸기");
  await field("찾을 내용", "a");
  await field("바꿀 내용", "hello");
  await result("hello");
  await page.$eval(".ws-options input[type=checkbox]", (el) => el.click());
  await field("찾을 내용", "(a+)+$");
  await editor("a".repeat(40) + "!");
  await result("실행 시간이 초과");
  await page.$eval(".ws-options input[type=checkbox]", (el) => el.click());
  await field("작업", "Markdown");
  await editor("# 제목\n\n**본문**");
  await page.waitForSelector(".ws-result strong");
  await go("encoding");
  await editor("안녕");
  await result("7JWI64WV");
  await field("변환", "Base64 해독");
  await editor("7JWI64WV");
  await result("안녕");
  await field("변환", "SHA-256");
  await editor("abc");
  await result("ba7816bf8f01cfea");
  await go("data");
  await editor('[{"name":"홍길동","value":3}]');
  await result("홍길동");
  await field("출력 형식", "CSV");
  await result("name,value");
  await field("출력 형식", "YAML");
  await result("name: 홍길동");
  await field("입력 형식", "XML");
  await editor("<!DOCTYPE x><x/>");
  await result("DTD");
  await go("diff");
  await field("비교 방식", "JSON 구조");
  await editor('{"b":2,"a":1}');
  await editor('{"a":1,"b":2}', 1);
  await result("동일한 JSON");
  await go("requests");
  await editor("https://example.com/path?a=1&a=2");
  await click("분석");
  await result("example.com");
  await page.waitForSelector('input[aria-label="쿼리 값 1"]');
  await field("분석 대상", "cURL");
  await editor('curl https://example.com -H "X-Test: value"');
  await click("분석");
  await result("fetch(");
  await field("분석 대상", "JWT");
  const header = Buffer.from(
      JSON.stringify({ alg: "HS256", typ: "JWT" }),
    ).toString("base64url"),
    payload = Buffer.from(
      JSON.stringify({ sub: "sensitive-test", exp: 0 }),
    ).toString("base64url");
  await editor(header + "." + payload + ".c2ln");
  await click("분석");
  await result("sensitive-test");
  await wait(600);
  assert.equal(
    await page.evaluate(() =>
      localStorage.getItem("xitora:workspace:v1:requests"),
    ),
    null,
  );
  await go("mock-data");
  await field("행 수 (최대 10,000)", 3);
  await click("생성");
  await result("example".replace("example", "name"));
  const generated = JSON.parse(
    await page.$eval(".ws-result pre", (el) => el.textContent),
  );
  assert.equal(generated.length, 3);
  assert.equal(new Set(generated.map((r) => r.id)).size, 3);
  await go("svg");
  await editor(
    '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><script>alert(1)</script><image href="https://example.com/no"/><circle r="8" cx="10" cy="10"/></svg>',
  );
  assert.equal(
    await page.$eval(
      ".ws-result .ws-preview",
      (el) => el.querySelectorAll("script,image").length,
    ),
    0,
  );
  await click("PNG 저장");
  assert.ok((await downloaded("image.png")).length > 100);
  await go("motion");
  await editor("0% { opacity: 0; }\n100% { opacity: 1; }");
  await result("@keyframes");
  await go("colors");
  await field("HEX / RGB / HSL", "rgb(255, 0, 0)");
  await click("색상 변환");
  await page.waitForFunction(() =>
    document.querySelector(".ws-main").textContent.includes("#ff0000"),
  );
  await click("조화 팔레트 만들기");
  const image = path.resolve("public/icons/tool-192.png");
  await go("images");
  await upload(image);
  await field("너비 (0=원본)", 96);
  await click("변환");
  await status();
  assert.ok(await page.$(".ws-result img"));
  await field("출력 형식", "image/png");
  await field("처리", "단색");
  await field("너비 (0=원본)", 96);
  await page.evaluate(() => {
    const label = Array.from(
      document.querySelectorAll(".ws-options details label"),
    ).find((l) => l.querySelector("span")?.textContent === "너비");
    const el = label.querySelector("input");
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    ).set.call(el, "50");
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await click("변환");
  await status();
  await page.waitForFunction(
    () => document.querySelector(".ws-result img")?.naturalHeight === 192,
  );
  assert.equal(
    await page.$eval(".ws-result img", (image) => {
      const c = document.createElement("canvas");
      c.width = image.naturalWidth;
      c.height = image.naturalHeight;
      const ctx = c.getContext("2d");
      ctx.drawImage(image, 0, 0);
      return Array.from(
        ctx.getImageData(
          Math.floor(c.width * 0.3),
          Math.floor(c.height * 0.3),
          1,
          1,
        ).data,
      ).join(",");
    }),
    "17,17,17,255",
  );
  await click("파비콘 패키지");
  const icons = unzipSync(await downloaded("favicon.zip"));
  assert.ok(icons["favicon.ico"]);
  assert.ok(icons["android-chrome-512x512.png"]);
  const qrFile = path.join(folder, "fixture-qr.png");
  await QRCode.toFile(qrFile, "https://example.com/decoded");
  await go("qr");
  await upload(qrFile);
  await result("https://example.com/decoded");
  assert.equal(page.url(), base + "/tools/qr");
  await page.waitForFunction(() =>
    Array.from(document.querySelectorAll("button")).some(
      (b) => b.textContent === "SVG 저장" && !b.disabled,
    ),
  );
  await click("SVG 저장");
  assert.ok(strFromU8(await downloaded("qr.svg")).includes("<svg"));
  await click("카메라로 읽기");
  await page.waitForFunction(
    () => document.querySelector("video")?.srcObject?.active,
  );
  await page.evaluate(
    () =>
      (window.cameraTracks = document
        .querySelector("video")
        .srcObject.getTracks()),
  );
  await click("카메라 정지");
  assert.equal(
    await page.evaluate(() =>
      window.cameraTracks.every((t) => t.readyState === "ended"),
    ),
    true,
  );
  await click("카메라로 읽기");
  await page.waitForFunction(
    () => document.querySelector("video")?.srcObject?.active,
  );
  await page.evaluate(
    () =>
      (window.cameraTracks = document
        .querySelector("video")
        .srcObject.getTracks()),
  );
  await click("← 도구 목록");
  await page.waitForSelector(".ws-grid");
  assert.equal(
    await page.evaluate(() =>
      window.cameraTracks.every((t) => t.readyState === "ended"),
    ),
    true,
  );
  const pdf = await PDFDocument.create();
  pdf.addPage([200, 200]);
  pdf.addPage([300, 300]);
  const pdfFile = path.join(folder, "fixture.pdf");
  await fs.writeFile(pdfFile, await pdf.save());
  await go("pdf");
  await upload(pdfFile);
  await field("페이지 순서 (빈칸=전체)", "2,1");
  await click("실행·저장");
  await click("취소");
  await status("취소했습니다.");
  await click("실행·저장");
  let out = await PDFDocument.load(await downloaded("document.pdf"));
  assert.equal(out.getPage(0).getWidth(), 300);
  await field("작업", "PDF → 이미지");
  await field("페이지 순서 (빈칸=전체)", "1");
  await click("실행·저장");
  let pages = unzipSync(await downloaded("pages.zip"));
  assert.ok(pages["1-page-1.png"]);
  await fs.unlink(path.join(folder, "pages.zip"));
  await field("작업", "페이지별 나누기");
  await field("페이지 순서 (빈칸=전체)", "1,2");
  await field("추가 회전", "90");
  await click("실행·저장");
  const split = unzipSync(await downloaded("pages.zip"));
  assert.equal(Object.keys(split).length, 2);
  const single = await PDFDocument.load(split["1-page-1.pdf"]);
  assert.equal(single.getPageCount(), 1);
  assert.equal(single.getPage(0).getRotation().angle, 90);
  await fs.unlink(path.join(folder, "document.pdf"));
  await field("작업", "이미지 → PDF");
  await upload(image);
  await click("실행·저장");
  assert.equal(
    (await PDFDocument.load(await downloaded("document.pdf"))).getPageCount(),
    1,
  );
  await field("작업", "PDF → 이미지");
  await field("페이지 순서 (빈칸=전체)", "1");
  await field("추가 회전", "0");
  const wav = Buffer.alloc(44 + 16000);
  wav.write("RIFF");
  wav.writeUInt32LE(wav.length - 8, 4);
  wav.write("WAVEfmt ", 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(8000, 24);
  wav.writeUInt32LE(16000, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(16000, 40);
  for (let i = 0; i < 8000; i++)
    wav.writeInt16LE(
      Math.round(Math.sin((i * 2 * Math.PI * 440) / 8000) * 12000),
      44 + i * 2,
    );
  const wavFile = path.join(folder, "fixture.wav");
  await fs.writeFile(wavFile, wav);
  await go("audio");
  await upload(wavFile);
  await status();
  await field("시작 (초)", 0.1);
  await field("끝 (초)", 0.6);
  await click("구간 변환");
  await page.waitForSelector(".ws-result audio");
  await click("오디오 저장");
  {
    const data = await downloaded("audio.wav");
    assert.equal(data.readUInt32LE(40), data.readUInt32LE(24) * 0.5 * 2);
  }
  await field("출력", "MP3");
  await click("구간 변환");
  await status();
  await click("오디오 저장");
  assert.ok((await downloaded("audio.mp3")).length > 100);
  const txtFile = path.join(folder, "fixture.txt");
  await fs.writeFile(txtFile, "duplicate test");
  const txt2 = path.join(folder, "fixture2.txt");
  await fs.writeFile(txt2, "duplicate test");
  await go("files");
  await (await page.$(".ws-drop input")).uploadFile(txtFile, txt2);
  await field("접두사", "new-");
  await click("이름을 바꾼 복사본 ZIP");
  assert.equal(
    strFromU8(
      unzipSync(await downloaded("renamed-files.zip"))["new-fixture.txt"],
    ),
    "duplicate test",
  );
  await click("체크섬·중복 검사");
  await result("fixture.txt = fixture2.txt");
  await go("focus");
  await click("시작");
  await page.waitForFunction(() =>
    document.querySelector(".ws-result").textContent.includes("일시 정지"),
  );
  await click("일시 정지");
  await click("집중·휴식 전환");
  await result("휴식");
  await go("datetime");
  await field("Unix 타임스탬프", "0");
  await result("1970-01-01T00:00:00.000Z");
  await field("기준 날짜", "");
  assert.ok(await page.$(".ws-main"));
  await go("units");
  await field("종류", "온도");
  await field("값", 0);
  await field("결과 단위", "K");
  await result("273.15");
  await go("settlement");
  await click("비용 추가");
  await field("금액 (원)", 10001);
  await result("5,000원");
  // Draft expiry is based on editing, and expired content cannot reappear.
  await go("text");
  await editor("saved-draft");
  await wait(650);
  await click("설정 내보내기");
  const stateFile = await downloaded("text.json");
  assert.equal(JSON.parse(stateFile).version, 1);
  await editor("overwritten");
  await (
    await page.$(".ws-button input[type=file]")
  ).uploadFile(path.join(folder, "text.json"));
  await page.waitForFunction(
    () => document.querySelector(".ws-editor").value === "saved-draft",
  );
  await wait(650);
  const savedAt = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("xitora:workspace:v1:text")).updatedAt,
  );
  await page.reload();
  await page.waitForSelector(".ws-editor");
  await wait(600);
  assert.equal(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("xitora:workspace:v1:text")).updatedAt,
    ),
    savedAt,
  );
  await page.evaluate(() => {
    const key = "xitora:workspace:v1:text",
      v = JSON.parse(localStorage.getItem(key));
    v.updatedAt = Date.now() - 8 * 86400000;
    localStorage.setItem(key, JSON.stringify(v));
  });
  await page.reload();
  await page.waitForSelector(".ws-editor");
  assert.equal(await page.$eval(".ws-editor", (el) => el.value), "");
  await page.keyboard.down("Control");
  await page.keyboard.press("k");
  await page.keyboard.up("Control");
  await page.waitForSelector("[role=dialog]");
  await page.keyboard.press("Escape");
  await page.setViewport({ width: 390, height: 844 });
  for (const id of ["text", "images", "pdf", "audio", "settlement", "units"]) {
    await go(id);
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await click("결과");
    assert.equal(
      await page.$eval(".ws-main", (el) => getComputedStyle(el).display),
      "none",
    );
    if (
      (await page.$eval(
        ".ws-options",
        (el) => getComputedStyle(el).display,
      )) === "none"
    )
      await click("옵션 열기");
    assert.notEqual(
      await page.$eval(".ws-options", (el) => getComputedStyle(el).display),
      "none",
    );
  }
  await page.setViewport({ width: 1440, height: 1000 });
  await go("text");
  await page.waitForFunction(
    async () => !!(await navigator.serviceWorker.getRegistration())?.active,
    { timeout: 30000 },
  );
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await page.setOfflineMode(true);
  for (const id of [
    "text",
    "encoding",
    "data",
    "diff",
    "requests",
    "mock-data",
    "svg",
    "motion",
    "colors",
    "images",
    "qr",
    "pdf",
    "audio",
    "files",
    "focus",
    "datetime",
    "units",
    "settlement",
  ]) {
    await go(id);
    assert.ok(await page.$(".ws-main"));
  }
  await go("encoding");
  await field("변환", "Base64");
  await editor("offline");
  await result("b2ZmbGluZQ==");
  await go("pdf");
  await field("작업", "PDF → 이미지");
  await upload(pdfFile);
  await fs.unlink(path.join(folder, "pages.zip"));
  await click("실행·저장");
  assert.ok(unzipSync(await downloaded("pages.zip"))["1-page-1.png"]);
  await page.setOfflineMode(false);
  assert.deepEqual(errors, []);
  console.log(
    "PASS: 18 workspaces, downloads, privacy, draft expiry, mobile and offline",
  );
} finally {
  await browser.close();
  await fs.rm(folder, { recursive: true, force: true });
}
