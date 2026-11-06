import puppeteer from 'puppeteer';
import { toolsList } from '../src/data/tools.ts';

const routes = [
  '/', '/posts', '/projects', '/settings', '/contact', '/markdownguide', '/tools',
  ...toolsList.map(tool => `/tools/${tool.id}`),
  '/posts/1', '/posts/2', '/settings/01', '/settings/02', '/settings/03', '/settings/04'
];

async function runVerification() {
  console.log(`Starting automated verification for ${routes.length} routes...`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: Number(process.env.VIEWPORT_WIDTH) || 1280, height: 900 });

  const errors = [];
  const results = [];

  page.on('pageerror', (err) => {
    errors.push({ type: 'pageerror', message: err.message });
  });

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      // 외부 파비콘 등 제3자 리소스 404는 앱 런타임 에러가 아니므로 필터링
      if (text.includes('Failed to load resource: the server responded with a status of 404')) {
        return;
      }
      errors.push({ type: 'console.error', text });
    }
  });

  page.on('response', (res) => {
    if (res.status() === 404) {
      console.warn(`[404 URL on ${page.url()}]: ${res.url()}`);
    }
  });

  page.on('requestfailed', (req) => {
    console.warn(`[Request Failed on ${page.url()}]: ${req.url()} (${req.failure()?.errorText})`);
  });

  for (const route of routes) {
    const url = `${process.env.BASE_URL || "http://127.0.0.1:4173"}${route}`;
    try {
      errors.length = 0; // 초기화
      const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });
      await page.waitForSelector('h1');

      const status = response ? response.status() : 0;
      const title = await page.title();
      const rootText = await page.$eval('#root', (el) => el.innerText.trim()).catch(() => '');

      const hasContent = rootText.length > 20;
      const isOk = status === 200 && hasContent && errors.length === 0;

      results.push({
        route,
        status,
        title,
        contentLength: rootText.length,
        errors: [...errors],
        ok: isOk
      });

      console.log(`[${isOk ? 'PASS' : 'FAIL'}] ${route} (status: ${status}, textLen: ${rootText.length}, errs: ${errors.length})`);
    } catch (err) {
      results.push({
        route,
        status: 0,
        error: err.message,
        ok: false
      });
      console.error(`[FAIL] ${route} -> ${err.message}`);
    }
  }

  await browser.close();

  const failed = results.filter((r) => !r.ok);
  if (failed.length > 0) {
    console.error(`\nVerification completed with ${failed.length} failure(s):`);
    console.error(JSON.stringify(failed, null, 2));
    process.exit(1);
  } else {
    console.log(`\nAll ${routes.length} routes passed verification successfully!`);
    process.exit(0);
  }
}

runVerification().catch((err) => {
  console.error('Fatal error during verification:', err);
  process.exit(1);
});
