import puppeteer from 'puppeteer';
import { preview } from 'vite';
import path from 'node:path';

const ARTIFACT_DIR = 'C:/Users/user/.gemini/antigravity/brain/96af6933-2a23-438d-973a-982228de76f7';

async function main() {
  const server = await preview({
    preview: { port: 4173 },
  });

  const url = 'http://localhost:4173/tools/world-time';
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 950, deviceScaleFactor: 2 });

    await page.goto(url, { waitUntil: 'networkidle0' });
    await new Promise((res) => setTimeout(res, 800));

    // 1. 데스크톱 기본 화면
    const defaultPath = path.join(ARTIFACT_DIR, 'world_time_desktop.png');
    await page.screenshot({ path: defaultPath });
    console.log('Saved desktop screenshot:', defaultPath);

    // 2. 미니 위젯 모드 토글
    const miniBtn = await page.$('.floating-header-mode-btn');
    if (miniBtn) {
      await miniBtn.click();
      await new Promise((res) => setTimeout(res, 600));

      const miniPath = path.join(ARTIFACT_DIR, 'world_time_mini.png');
      await page.screenshot({ path: miniPath });
      console.log('Saved mini mode screenshot:', miniPath);

      // 복원
      const restoreBtn = await page.$('.floating-header-mode-btn.restore');
      if (restoreBtn) await restoreBtn.click();
      await new Promise((res) => setTimeout(res, 400));
    }

    // 3. 모바일 화면
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
    await page.reload({ waitUntil: 'networkidle0' });
    await new Promise((res) => setTimeout(res, 800));

    const mobilePath = path.join(ARTIFACT_DIR, 'world_time_mobile.png');
    await page.screenshot({ path: mobilePath });
    console.log('Saved mobile screenshot:', mobilePath);

  } finally {
    await browser.close();
    server.httpServer.close();
    process.exit(0);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
