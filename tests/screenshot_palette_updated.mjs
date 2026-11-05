import puppeteer from 'puppeteer';
import { preview } from 'vite';
import path from 'node:path';

const ARTIFACT_DIR = 'C:/Users/user/.gemini/antigravity/brain/96af6933-2a23-438d-973a-982228de76f7';

async function main() {
  const server = await preview({
    preview: { port: 4177 },
  });

  const url = 'http://localhost:4177/tools/color-palette';
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 1200, deviceScaleFactor: 2 });

    await page.goto(url, { waitUntil: 'networkidle0' });
    await new Promise((res) => setTimeout(res, 800));

    // '팔레트 생성기' 탭 클릭
    const tabButtons = await page.$$('button');
    for (const btn of tabButtons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text && text.includes('팔레트 생성기')) {
        await btn.click();
        break;
      }
    }
    await new Promise((res) => setTimeout(res, 500));

    // 첫 번째 슬롯 잠금 클릭 (고정됨 -> 해제로 표시되는지 확인)
    const lockButtons = await page.$$('button[title*="잠금"]');
    if (lockButtons.length >= 1) {
      await lockButtons[0].click();
      await new Promise((res) => setTimeout(res, 300));
    }

    // 새 팔레트 생성하기 2회 클릭하여 최근 기록 채우기
    for (const btn of await page.$$('button')) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text && text.includes('새 팔레트 생성하기')) {
        await btn.click();
        await new Promise((res) => setTimeout(res, 400));
        await btn.click();
        await new Promise((res) => setTimeout(res, 400));
        break;
      }
    }

    // 스크롤 약간 조정
    await page.evaluate(() => window.scrollBy(0, 150));
    await new Promise((res) => setTimeout(res, 300));

    const viewPath = path.join(ARTIFACT_DIR, 'color_palette_updated_view.png');
    await page.screenshot({ path: viewPath });
    console.log('Saved updated screenshot:', viewPath);

  } finally {
    await browser.close();
    server.httpServer.close();
    process.exit(0);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
