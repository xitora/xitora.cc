import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const templatePath = path.join(distDir, 'index.html');

if (!fs.existsSync(templatePath)) {
  console.error('[generate-meta-pages] dist/index.html does not exist. Run vite build first.');
  process.exit(1);
}

const template = fs.readFileSync(templatePath, 'utf8');

// HTML 특수문자 이스케이프 함수
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// 마크다운에서 본문 발췌문 추출 함수
function getExcerpt(markdown, maxLength = 130) {
  if (!markdown) return '';
  const cleaned = markdown
    .replace(/```[\s\S]*?```/g, ' ')               // 코드 블록 제거
    .replace(/`([^`]+)`/g, '$1')                   // 인라인 코드 서식 제거
    .replace(/\[(?:LinkWidget|FileWidget):.*?\]\(.*?\)/gi, '') // 위젯 제거
    .replace(/!\[.*?\]\(.*?\)/g, '')               // 이미지 마크다운 제거
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')             // 링크 텍스트 유지
    .replace(/<[^>]+>/g, '')                        // HTML 태그 제거
    .replace(/(?:^|\n)\s*#{1,6}\s+/g, ' ')          // 헤더 기호 제거
    .replace(/(\*\*|__)(.*?)\1/g, '$2')             // 굵게 서식 제거
    .replace(/(\*|_)(.*?)\1/g, '$2')                // 기울임 서식 제거
    .replace(/~~(.*?)~~/g, '$1')                    // 취소선 서식 제거
    .replace(/(?:^|\n)\s*>\s*/g, ' ')               // 인용 기호 제거
    .replace(/(?:^|\n)\s*[-*+]\s+/g, ' ')           // 줄 시작 불릿 기호 제거
    .replace(/\s+/g, ' ')                           // 연속 공백/줄바꿈 단일화
    .trim();

  if (cleaned.length <= maxLength) return cleaned;
  return cleaned.slice(0, maxLength).trim() + '...';
}

// 프론트매터 파싱 함수
function parseFrontmatter(markdown) {
  const frontmatterRegex = /^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n([\s\S]*)$/;
  const match = markdown.match(frontmatterRegex);
  if (!match) {
    return { data: {}, content: markdown };
  }
  const yamlContent = match[1];
  const bodyContent = match[2];
  const data = {};
  yamlContent.split(/\r?\n/).forEach((line) => {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.slice(0, colonIndex).trim();
      let value = line.slice(colonIndex + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      data[key] = value;
    }
  });
  return { data, content: bodyContent };
}

// 대상 페이지별 메타 태그가 주입된 HTML 생성
function createHtml(baseHtml, { title, description, image, url, isArticle = false }) {
  const fullImageUrl = image.startsWith('http') ? image : `https://xitora.cc${image.startsWith('/') ? '' : '/'}${image}`;

  // 기존 타이틀 및 OpenGraph / Twitter / Description 메타 태그 제거
  let html = baseHtml
    .replace(/<title>[\s\S]*?<\/title>/gi, '')
    .replace(/<meta\s+property=["']og:[^"']+["'][^>]*>/gi, '')
    .replace(/<meta\s+name=["'](?:twitter:[^"']+|description)["'][^>]*>/gi, '');

  const metaTags = [
    `<title>${escapeHtml(title)}</title>`,
    `<meta property="og:site_name" content="xitora.cc" />`,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:type" content="${isArticle ? 'article' : 'website'}" />`,
    `<meta property="og:url" content="${escapeHtml(url)}" />`,
    `<meta property="og:image" content="${escapeHtml(fullImageUrl)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
    `<meta name="twitter:image" content="${escapeHtml(fullImageUrl)}" />`,
  ];

  if (description) {
    metaTags.push(`<meta name="description" content="${escapeHtml(description)}" />`);
    metaTags.push(`<meta property="og:description" content="${escapeHtml(description)}" />`);
    metaTags.push(`<meta name="twitter:description" content="${escapeHtml(description)}" />`);
  }

  const tagsString = '\n    ' + metaTags.join('\n    ') + '\n  ';
  html = html.replace('</head>', `${tagsString}</head>`);
  return html;
}

// 파일 안전하게 작성
function writePage(relPath, content) {
  const targetPath = path.join(distDir, relPath);
  const targetDir = path.dirname(targetPath);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  fs.writeFileSync(targetPath, content, 'utf8');
}

const defaultImage = 'https://xitora.cc/assets/profile-art.png';
const generatedList = [];

// 1. 메인 페이지 (/)
const homeHtml = createHtml(template, {
  title: '메인 페이지',
  description: 'xitora의 개인 웹사이트. 기술 블로그 포스트, 유용한 웹 기반 도구 모음 및 인게임 설정 정보를 제공합니다.',
  image: defaultImage,
  url: 'https://xitora.cc/',
});
writePage('index.html', homeHtml);
generatedList.push('/ (메인 페이지)');

// 2. 게시글 목록 (/posts)
const postsHtml = createHtml(template, {
  title: '게시글 목록',
  description: '개발, 일상, 유용한 정보와 기술 팁을 다루는 xitora의 블로그 포스트 목록입니다.',
  image: defaultImage,
  url: 'https://xitora.cc/posts',
});
writePage('posts/index.html', postsHtml);
writePage('posts.html', postsHtml);
generatedList.push('/posts (게시글 목록)');

const projectsHtml = createHtml(template, {
  title: '프로젝트',
  description: '직접 만들고 운영하는 로얄상구 대여 예약과 츄니토라를 소개합니다.',
  image: defaultImage,
  url: 'https://xitora.cc/projects',
});
writePage('projects/index.html', projectsHtml);
writePage('projects.html', projectsHtml);
generatedList.push('/projects (프로젝트)');

// 3. 인게임 설정 목록 (/settings)
const settingsHtml = createHtml(template, {
  title: '인게임 설정 목록',
  description: '발로란트, 레인보우 식스 시즈, 디제이맥스 등 플레이하는 게임들의 DPI, 감도 및 그래픽 설정 모음입니다.',
  image: defaultImage,
  url: 'https://xitora.cc/settings',
});
writePage('settings/index.html', settingsHtml);
writePage('settings.html', settingsHtml);
generatedList.push('/settings (인게임 설정 목록)');

// 4. 연락처 (/contact)
const contactHtml = createHtml(template, {
  title: '연락처',
  description: 'xitora와의 소통을 위한 이메일, GitHub, Discord, SNS 등 연락처 링크 모음입니다.',
  image: defaultImage,
  url: 'https://xitora.cc/contact',
});
writePage('contact/index.html', contactHtml);
writePage('contact.html', contactHtml);
generatedList.push('/contact (연락처)');

// 5. 마크다운 가이드 (/markdownguide)
const mdGuideHtml = createHtml(template, {
  title: '마크다운 가이드',
  description: '웹사이트에서 지원하는 마크다운 서식, 위젯(LinkWidget, FileWidget) 및 코드 하이라이트 작성 가이드입니다.',
  image: defaultImage,
  url: 'https://xitora.cc/markdownguide',
});
writePage('markdownguide/index.html', mdGuideHtml);
writePage('markdownguide.html', mdGuideHtml);
generatedList.push('/markdownguide (마크다운 가이드)');

// 5-1. 도구 목록 (/tools)
const toolsHtml = createHtml(template, {
  title: '도구 목록',
  description: '포맷 변환, 이미지 최적화, 세계 시간, QR 코드, 색상 팔레트, 정규식 도구를 제공합니다.',
  image: defaultImage,
  url: 'https://xitora.cc/tools',
});
writePage('tools/index.html', toolsHtml);
writePage('tools.html', toolsHtml);
generatedList.push('/tools (도구 목록)');

// 5-1. CSS 애니메이션 이징(Easing) 샌드박스 (/tools/css-easing-sandbox)
const cssEasingSandboxHtml = createHtml(template, {
  title: 'CSS 애니메이션 이징(Easing) 샌드박스',
  description: 'cubic-bezier 커브를 인터랙티브하게 조절하며 UI 전환 프리뷰 및 코드 추출 도구',
  image: defaultImage,
  url: 'https://xitora.cc/tools/css-easing-sandbox',
});
writePage('tools/css-easing-sandbox/index.html', cssEasingSandboxHtml);
writePage('tools/css-easing-sandbox.html', cssEasingSandboxHtml);
generatedList.push('/tools/css-easing-sandbox (CSS 애니메이션 이징 샌드박스)');

// 5-2. cURL → 언어별 코드 변환기 (/tools/curl-converter)
const curlConverterHtml = createHtml(template, {
  title: 'cURL → 언어별 코드 변환기',
  description: 'cURL 명령어를 Fetch, Axios, Python Requests, Go HTTP 코드로 즉시 변환하는 도구',
  image: defaultImage,
  url: 'https://xitora.cc/tools/curl-converter',
});
writePage('tools/curl-converter/index.html', curlConverterHtml);
writePage('tools/curl-converter.html', curlConverterHtml);
generatedList.push('/tools/curl-converter (cURL → 언어별 코드 변환기)');

// 5-3. Favicon & 앱 아이콘 생성기 (/tools/favicon-generator)
const faviconGeneratorHtml = createHtml(template, {
  title: 'Favicon & 앱 아이콘 생성기',
  description: '단일 고해상도 이미지를 기반으로 웹용 파비콘(ico/png) 및 iOS/안드로이드 규격별 번들 ZIP 생성기',
  image: defaultImage,
  url: 'https://xitora.cc/tools/favicon-generator',
});
writePage('tools/favicon-generator/index.html', faviconGeneratorHtml);
writePage('tools/favicon-generator.html', faviconGeneratorHtml);
generatedList.push('/tools/favicon-generator (Favicon & 앱 아이콘 생성기)');

// 5-3. JWT 디코더 & 검증기 (/tools/jwt-debugger)
const jwtDebuggerHtml = createHtml(template, {
  title: 'JWT 디코더 & 검증기',
  description: 'JWT 토큰의 Header와 Payload를 실시간 디코딩하고, 만료 시간(exp) 및 HMAC 서명 유효성을 검증하는 도구',
  image: defaultImage,
  url: 'https://xitora.cc/tools/jwt-debugger',
});
writePage('tools/jwt-debugger/index.html', jwtDebuggerHtml);
writePage('tools/jwt-debugger.html', jwtDebuggerHtml);
generatedList.push('/tools/jwt-debugger (JWT 디코더 & 검증기)');

// 5-4. 단위 & 환율 변환기 (/tools/unit-currency-converter)
const unitConverterHtml = createHtml(template, {
  title: '단위 & 환율 변환기',
  description: '길이, 면적(평 ↔ ㎡), 무게, 데이터 단위 및 주요 외화 환율 즉시 계산 도구',
  image: defaultImage,
  url: 'https://xitora.cc/tools/unit-currency-converter',
});
writePage('tools/unit-currency-converter/index.html', unitConverterHtml);
writePage('tools/unit-currency-converter.html', unitConverterHtml);
generatedList.push('/tools/unit-currency-converter (단위 & 환율 변환기)');

// 5-5. 더치페이 & 정산 계산기 (/tools/dutch-pay-calculator)
const dutchPayHtml = createHtml(template, {
  title: '더치페이 & 정산 계산기',
  description: 'n빵 균등 정산, 2차/차등 항목 정산, 100원 단위 절사 및 카카오톡 영수증 공유 도구',
  image: defaultImage,
  url: 'https://xitora.cc/tools/dutch-pay-calculator',
});
writePage('tools/dutch-pay-calculator/index.html', dutchPayHtml);
writePage('tools/dutch-pay-calculator.html', dutchPayHtml);
generatedList.push('/tools/dutch-pay-calculator (더치페이 & 정산 계산기)');

// 5-6. 디지털 노이즈 사운드 생성기 (/tools/noise-generator)
const noiseGeneratorHtml = createHtml(template, {
  title: '디지털 노이즈 사운드 생성기',
  description: '백색소음, 빗소리, 모닥불 등 웹 오디오 기반 수면·집중용 앰비언스 믹서 도구',
  image: defaultImage,
  url: 'https://xitora.cc/tools/noise-generator',
});
writePage('tools/noise-generator/index.html', noiseGeneratorHtml);
writePage('tools/noise-generator.html', noiseGeneratorHtml);
generatedList.push('/tools/noise-generator (디지털 노이즈 사운드 생성기)');

// 5-7. 더미 데이터(Mock Data) 생성기 (/tools/mock-data-generator)
const mockDataGeneratorHtml = createHtml(template, {
  title: '더미 데이터(Mock Data) 생성기',
  description: '이름, 이메일, 주소, UUID 등 스키마 정의에 따른 JSON/CSV 가상 데이터 대량 생성 도구',
  image: defaultImage,
  url: 'https://xitora.cc/tools/mock-data-generator',
});
writePage('tools/mock-data-generator/index.html', mockDataGeneratorHtml);
writePage('tools/mock-data-generator.html', mockDataGeneratorHtml);
generatedList.push('/tools/mock-data-generator (더미 데이터 생성기)');

// 5-4. Universal Data Inspector (/tools/data-inspector)
const dataInspectorHtml = createHtml(template, {
  title: 'Universal Data Inspector',
  description: '62+ Data Formats Converter & Analyzer',
  image: defaultImage,
  url: 'https://xitora.cc/tools/data-inspector',
});
writePage('tools/data-inspector/index.html', dataInspectorHtml);
writePage('tools/data-inspector.html', dataInspectorHtml);
generatedList.push('/tools/data-inspector (포맷 변환 도구)');

// 5-3. 세계 시간 조율 도구 (/tools/world-time)
const worldTimeHtml = createHtml(template, {
  title: '세계 시간 조율 도구',
  description: '다국가 협업을 위한 24시간 인터랙티브 시차 비교 및 근무 시간 조율 도구',
  image: defaultImage,
  url: 'https://xitora.cc/tools/world-time',
});
writePage('tools/world-time/index.html', worldTimeHtml);
writePage('tools/world-time.html', worldTimeHtml);
generatedList.push('/tools/world-time (세계 시간 조율 도구)');

// 5-4. 이미지 최적화 도구 (/tools/image-optimizer)
const imageOptimizerHtml = createHtml(template, {
  title: '이미지 최적화 도구',
  description: '브라우저 로컬 기반 크기 조절·포맷 변환 이미지 압축, 포맷 변환 및 비포/애프터 비교 도구',
  image: defaultImage,
  url: 'https://xitora.cc/tools/image-optimizer',
});
writePage('tools/image-optimizer/index.html', imageOptimizerHtml);
writePage('tools/image-optimizer.html', imageOptimizerHtml);
generatedList.push('/tools/image-optimizer (이미지 최적화 도구)');

// 5-5. QR 코드 생성기 (/tools/qr-generator)
const qrGeneratorHtml = createHtml(template, {
  title: 'QR 코드 생성기',
  description: '브라우저 로컬 기반 고화질 벡터 및 로고 QR 코드 생성 도구',
  image: defaultImage,
  url: 'https://xitora.cc/tools/qr-generator',
});
writePage('tools/qr-generator/index.html', qrGeneratorHtml);
writePage('tools/qr-generator.html', qrGeneratorHtml);
generatedList.push('/tools/qr-generator (QR 코드 생성기)');

// 5-6. SVG 경로(Path) 비주얼라이저 (/tools/svg-path-visualizer)
const svgPathVisualizerHtml = createHtml(template, {
  title: 'SVG 경로(Path) 비주얼라이저',
  description: '복잡한 SVG Path(d 속성) 코드를 붙여넣어 노드와 베지어 곡선 포인트를 시각적으로 분해·검사하는 도구',
  image: defaultImage,
  url: 'https://xitora.cc/tools/svg-path-visualizer',
});
writePage('tools/svg-path-visualizer/index.html', svgPathVisualizerHtml);
writePage('tools/svg-path-visualizer.html', svgPathVisualizerHtml);
generatedList.push('/tools/svg-path-visualizer (SVG 경로 비주얼라이저)');

// 5-6. URL 파서 & 쿼리스트링 빌더 (/tools/url-parser)
const urlParserHtml = createHtml(template, {
  title: 'URL 파서 & 쿼리스트링 빌더',
  description: '긴 URL의 Protocol, Host, Path, Query Parameter 분해 및 파라미터 실시간 추가·수정 도구',
  image: defaultImage,
  url: 'https://xitora.cc/tools/url-parser',
});
writePage('tools/url-parser/index.html', urlParserHtml);
writePage('tools/url-parser.html', urlParserHtml);
generatedList.push('/tools/url-parser (URL 파서 & 쿼리스트링 빌더)');

// 5-6. 정규식 테스터 (/tools/regex-tester)
const regexTesterHtml = createHtml(template, {
  title: '정규식 테스터',
  description: '정규표현식 실시간 매칭 분석, 캡처 그룹 하이라이트 및 코드 스니펫 생성 도구',
  image: defaultImage,
  url: 'https://xitora.cc/tools/regex-tester',
});
writePage('tools/regex-tester/index.html', regexTesterHtml);
writePage('tools/regex-tester.html', regexTesterHtml);
generatedList.push('/tools/regex-tester (정규식 테스터)');

// 5-7. 색상 팔레트 분석 도구 (/tools/color-palette)
const colorPaletteHtml = createHtml(template, {
  title: '색상 팔레트 분석 도구',
  description: '이미지 주요 색상 자동 추출, 색채 조화 팔레트 및 WCAG 접근성 명도 대비 분석 도구',
  image: defaultImage,
  url: 'https://xitora.cc/tools/color-palette',
});
writePage('tools/color-palette/index.html', colorPaletteHtml);
writePage('tools/color-palette.html', colorPaletteHtml);
generatedList.push('/tools/color-palette (색상 팔레트 분석 도구)');

// 5-12. 보안 비밀번호 생성기 (/tools/password-generator)
const passwordGeneratorHtml = createHtml(template, {
  title: '보안 비밀번호 생성기',
  description: '암호학적 난수(CSPRNG) 기반의 무작위 비밀번호, Diceware 패스프레이즈 및 PIN 생성 도구',
  image: defaultImage,
  url: 'https://xitora.cc/tools/password-generator',
});
writePage('tools/password-generator/index.html', passwordGeneratorHtml);
writePage('tools/password-generator.html', passwordGeneratorHtml);
generatedList.push('/tools/password-generator (보안 비밀번호 생성기)');

// 6. 게시글 상세 (/posts/### 및 /post/###)
const postsDir = path.join(rootDir, 'src', 'data', 'posts');
if (fs.existsSync(postsDir)) {
  const postFiles = fs.readdirSync(postsDir).filter((f) => f.endsWith('.md'));
  for (const file of postFiles) {
    const raw = fs.readFileSync(path.join(postsDir, file), 'utf8');
    const parsed = parseFrontmatter(raw);
    const id = parsed.data.id || file.replace('.md', '');
    const title = parsed.data.title || '제목 없음';
    const category = parsed.data.category || '일반';
    const bannerImg = parsed.data.bannerImg || defaultImage;
    const excerpt = getExcerpt(parsed.content);

    const postPageTitle = `[${category}] ${title}`;
    const postHtml = createHtml(template, {
      title: postPageTitle,
      description: excerpt,
      image: bannerImg,
      url: `https://xitora.cc/posts/${id}`,
      isArticle: true,
    });

    writePage(`posts/${id}/index.html`, postHtml);
    writePage(`posts/${id}.html`, postHtml);
    writePage(`post/${id}/index.html`, postHtml);
    writePage(`post/${id}.html`, postHtml);

    generatedList.push(`/posts/${id} (${postPageTitle})`);
  }
}

// 7. 인게임 설정 상세 (/settings/###)
const settingsFilePath = path.join(rootDir, 'src', 'data', 'settings.ts');
if (fs.existsSync(settingsFilePath)) {
  const settingsContent = fs.readFileSync(settingsFilePath, 'utf8');
  const gameRegex = /index:\s*["']([^"']+)["'][\s\S]*?game:\s*["']([^"']+)["']/g;
  let match;
  while ((match = gameRegex.exec(settingsContent)) !== null) {
    const index = match[1];
    const gameName = match[2];

    const gameHtml = createHtml(template, {
      title: `${gameName} 인게임 설정`,
      description: `${gameName}의 감도, DPI, 조준선, 그래픽 품질 및 주요 세부 인게임 설정 값입니다.`,
      image: defaultImage,
      url: `https://xitora.cc/settings/${index}`,
    });

    writePage(`settings/${index}/index.html`, gameHtml);
    writePage(`settings/${index}.html`, gameHtml);

    // 선행 0이 있는 경우(예: "01"), 선행 0 없는 경로("1")도 지원
    if (index.startsWith('0') && index.length > 1) {
      const strippedIndex = index.replace(/^0+/, '');
      writePage(`settings/${strippedIndex}/index.html`, gameHtml);
      writePage(`settings/${strippedIndex}.html`, gameHtml);
    }

    generatedList.push(`/settings/${index} (${gameName})`);
  }
}

// 8. sitemap.xml 자동 생성
const siteUrl = 'https://xitora.cc';
const today = new Date().toISOString().split('T')[0];

const cleanRoutes = Array.from(new Set(
  generatedList.map((item) => {
    const rawPath = item.split(' ')[0];
    return rawPath === '/' ? '' : rawPath;
  })
));

const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${cleanRoutes
  .map(
    (r) => `  <url>
    <loc>${siteUrl}${r}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${r === '' ? 'daily' : r.startsWith('/tools') ? 'weekly' : 'monthly'}</changefreq>
    <priority>${r === '' ? '1.0' : r.startsWith('/tools') ? '0.8' : '0.6'}</priority>
  </url>`
  )
  .join('\n')}
</urlset>
`;

writePage('sitemap.xml', sitemapXml);

// 9. 404.html 생성 (Cloudflare Pages SPA 폴백)
writePage('404.html', template);

// 10. _redirects 파일 dist 보장
const redirectsPath = path.join(rootDir, 'public', '_redirects');
if (fs.existsSync(redirectsPath)) {
  writePage('_redirects', fs.readFileSync(redirectsPath, 'utf8'));
}

console.log(`[generate-meta-pages] Pre-rendered ${generatedList.length} routes with custom metadata:`);
generatedList.forEach((r) => console.log(`  - ${r}`));
console.log(`[generate-meta-pages] Generated sitemap.xml with ${cleanRoutes.length} URLs, 404.html, and _redirects.`);

