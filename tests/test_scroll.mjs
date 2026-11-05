import puppeteer from 'puppeteer';

async function test() {
  const browser = await puppeteer.launch({ headless: 'new' });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    // 1. Requirement 1 Test: Page navigation scroll-to-top
    await page.goto('http://localhost:5173/posts', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => window.scrollTo(0, 1200));
    const yBefore = await page.evaluate(() => window.scrollY);
    console.log('Posts scrollY before nav:', yBefore);

    // Navigate to /tools
    await page.goto('http://localhost:5173/tools', { waitUntil: 'domcontentloaded' });
    // Allow any transition to settle
    await new Promise((r) => setTimeout(r, 200));
    const yAfter = await page.evaluate(() => window.scrollY);
    console.log('Tools scrollY after nav (should be 0):', yAfter);

    // 2. Requirement 2 Test: Lottery Page custom scrollbar
    await page.goto('http://localhost:5173/tools/decision-picker', { waitUntil: 'networkidle0' });

    // Inject 15 items to overflow the list
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const bulkBtn = btns.find((b) => b.textContent && b.textContent.includes('텍스트 일괄 입력'));
      if (bulkBtn) bulkBtn.click();
    });
    await new Promise((r) => setTimeout(r, 100));

    await page.evaluate(() => {
      const textarea = document.querySelector('textarea');
      if (textarea) {
        textarea.value = Array.from({ length: 15 }, (_, i) => `테스트 메뉴 ${i + 1}`).join('\n');
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
      }
      const btns = Array.from(document.querySelectorAll('button'));
      const applyBtn = btns.find((b) => b.textContent && b.textContent.includes('적용하기'));
      if (applyBtn) applyBtn.click();
    });
    await new Promise((r) => setTimeout(r, 300));

    // Check scroll container
    const scrollData = await page.evaluate(() => {
      const el = document.querySelector('.custom-scrollbar');
      if (!el) return null;
      return {
        hasCustomScrollbarClass: el.classList.contains('custom-scrollbar'),
        hasLenisPrevent: el.hasAttribute('data-lenis-prevent'),
        scrollHeight: el.scrollHeight,
        clientHeight: el.clientHeight,
        isScrollable: el.scrollHeight > el.clientHeight,
      };
    });
    console.log('Lottery list scrollData:', JSON.stringify(scrollData));

    // Scroll inside the list
    await page.evaluate(() => {
      const el = document.querySelector('.custom-scrollbar');
      if (el) el.scrollTop = 150;
    });
    await new Promise((r) => setTimeout(r, 200));

    await page.screenshot({ path: 'C:/Users/user/.gemini/antigravity/brain/96af6933-2a23-438d-973a-982228de76f7/verified_scroll_list.png' });
    console.log('Screenshot saved: verified_scroll_list.png');
  } finally {
    await browser.close();
  }
}

test().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
