import puppeteer from 'puppeteer';
import assert from 'node:assert/strict';
const base = process.env.BASE_URL || 'http://127.0.0.1:4173';
const browser = await puppeteer.launch({ headless: true });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const open = async route => {
    await page.goto(base + route, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('textarea, input');
  };
  const fill = async (selector, value) => {
    await page.$eval(selector, (element, text) => {
      const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(prototype, 'value').set.call(element, text);
      element.dispatchEvent(new Event('input', { bubbles: true }));
    }, value);
  };
  await open('/tools/regex-tester');
  await fill('textarea[placeholder*="테스트할"]', 'a'.repeat(32) + '!');
  await fill('input[placeholder*="정규표현식"]', '(a+)+$');
  await page.waitForFunction(() => document.body.innerText.includes('1.5초를 초과'), { timeout: 8000 });
  await fill('input[placeholder*="정규표현식"]', 'a+');
  await page.waitForFunction(() => !document.body.innerText.includes('1.5초를 초과'));
  console.log('PASS regex timeout and recovery');

  await open('/tools/unit-currency-converter');
  await page.evaluate(() => [...document.querySelectorAll('button')].find(b => b.textContent.trim() === '환율 (통화)').click());
  await page.waitForSelector('input[min="0.000001"]');
  await fill('input[placeholder="0"]', '2');
  await fill('input[min="0.000001"]', '1500');
  await page.waitForFunction(() => document.body.innerText.includes('3,000'));
  console.log('PASS manual currency calculation');

  await open('/tools/data-inspector');
  await fill('textarea[placeholder*="변환할"]', 'hello');
  const outputSelector = 'select:has(option[value="sha256"])';
  await page.select(outputSelector, 'sha256');
  await page.waitForFunction(() => [...document.querySelectorAll('textarea')].some(el => el.value.startsWith('2cf24dba')));
  assert.ok(await page.$eval('button[title="입력/출력 전환"]', element => element.disabled));
  assert.equal(await page.$$eval('select option[value="sha256"]', elements => elements.length), 1);
  console.log('PASS one-way formats are output-only and cannot be swapped');

  await open('/tools/url-parser');
  await fill('input[placeholder*="https://example.com"]', '//user:pass@example.com/a?%20key%20=value');
  await page.waitForFunction(() => document.body.innerText.includes('user:pass@example.com'));
  console.log('PASS URL credentials survive UI round trip');
  await open('/tools/image-optimizer');
  await page.evaluate(() => {
    window.__revoked = [];
    const revoke = URL.revokeObjectURL.bind(URL);
    URL.revokeObjectURL = url => { window.__revoked.push(url); revoke(url); };
    [...document.querySelectorAll('button')].find(button => button.textContent.includes('샘플 이미지로 바로 테스트')).click();
  });
  await page.waitForFunction(() => [...document.querySelectorAll('button[title="다운로드"]')].some(button => !button.disabled));
  await page.click('button[title="목록 비우기"]');
  await page.waitForFunction(() => window.__revoked.length > 0);
  console.log('PASS image conversion and preview resource cleanup');

  await open('/tools/jwt-debugger');
  const token = btoa(JSON.stringify({alg:'HS256'})) + '.' + btoa(JSON.stringify({sub:'test'})) + '.signature';
  await fill('textarea', token);
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable:true, value:{writeText:async()=>{throw new Error('Denied');}} }));
  await page.click('.jwt-card button[title*="복사"], .jwt-input-actions button');
  await page.waitForFunction(() => document.body.innerText.includes('복사하지 못했습니다'));
  console.log('PASS rejected clipboard writes show failure');

  assert.deepEqual(errors, []);
} finally { await browser.close(); }
