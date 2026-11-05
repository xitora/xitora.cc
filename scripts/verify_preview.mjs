import puppeteer from 'puppeteer';
import { spawn } from 'child_process';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/user/.gemini/antigravity/brain/96af6933-2a23-438d-973a-982228de76f7';

async function main() {
  console.log('Starting preview server...');
  const server = spawn('npm.cmd', ['run', 'preview', '--', '--port', '4173'], {
    cwd: 'e:/Projects/project_3',
    stdio: 'pipe',
    shell: true,
  });

  server.stdout.on('data', (d) => console.log('[server]', d.toString().trim()));
  server.stderr.on('data', (d) => console.error('[server-err]', d.toString().trim()));

  // 3초 대기
  await new Promise((r) => setTimeout(r, 3000));

  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  const routes = [
    { url: 'http://localhost:4173/tools', name: 'tools_list_all_new' },
    { url: 'http://localhost:4173/tools/css-easing-sandbox', name: 'css_easing_sandbox' },
    { url: 'http://localhost:4173/tools/mock-data-generator', name: 'mock_data_generator' },
    { url: 'http://localhost:4173/tools/url-parser', name: 'url_parser' },
    { url: 'http://localhost:4173/tools/favicon-generator', name: 'favicon_generator' },
    { url: 'http://localhost:4173/tools/svg-path-visualizer', name: 'svg_path_visualizer' },
  ];

  for (const item of routes) {
    console.log(`Visiting ${item.url}...`);
    await page.goto(item.url, { waitUntil: 'networkidle0' });
    const screenshotPath = path.join(ARTIFACT_DIR, `${item.name}.png`);
    await page.screenshot({ path: screenshotPath });
    console.log(`Saved screenshot to ${screenshotPath}`);
  }

  // 모바일 뷰포트에서도 도구 목록 확인
  await page.setViewport({ width: 375, height: 667 });
  await page.goto('http://localhost:4173/tools', { waitUntil: 'networkidle0' });
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'tools_list_mobile_new.png') });

  await browser.close();
  server.kill();

  console.log('Errors logged:', errors);
  console.log('Verification completed successfully!');
  process.exit(0);
}

main().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
