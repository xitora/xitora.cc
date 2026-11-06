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

const toolRegistry = JSON.parse(fs.readFileSync(path.join(rootDir, 'src/data/toolRegistry.json'), 'utf8'));
for (const tool of toolRegistry) {
  const html = createHtml(template, { title: tool.title, description: tool.description, image: defaultImage, url: `https://xitora.cc/tools/${tool.id}` });
  writePage(`tools/${tool.id}/index.html`, html);
  generatedList.push(`/tools/${tool.id} (${tool.title})`);
}

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

