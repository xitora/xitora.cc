import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import { flushSync } from "react-dom";
import { gearItems } from "./data/gear";
import { gameSettings } from "./data/settings";
import { contacts, type ContactItem } from "./data/contacts";
import { mockPosts, categories } from "./data/posts";
import { motion, AnimatePresence } from "framer-motion";
import Lenis from "lenis";
import { ArrowUpRight, ArrowLeft, Gamepad2, Settings, User, Monitor, Hash, MessageCircle, MessageSquare, Disc, Smartphone, Target, Music, Headphones, Swords, MonitorPlay, Copy, Check, ChevronLeft, ChevronRight, Wrench, FolderOpen } from "lucide-react";
import { SiGithub, SiDiscord, SiX, SiYoutube, SiKakaotalk, SiSteam, SiRiotgames, SiSpotify, SiTelegram } from "react-icons/si";
import { Mail } from "lucide-react";
import { toolsList } from "./data/tools";

// 18개 도구 및 마크다운/블로그 페이지 동적 코드 스플리팅 (초기 번들 경량화)
const PostListPage = lazy(() => import("./pages/PostListPage"));
const PostDetailPage = lazy(() => import("./pages/PostDetailPage"));
const MarkdownGuidePage = lazy(() => import("./pages/MarkdownGuidePage"));
const ProjectsPage = lazy(() => import("./pages/ProjectsPage"));
const ToolsListPage = lazy(() => import("./pages/ToolsListPage"));
const CssEasingSandboxPage = lazy(() => import("./pages/CssEasingSandboxPage"));
const CurlConverterPage = lazy(() => import("./pages/CurlConverterPage"));
const FaviconGeneratorPage = lazy(() => import("./pages/FaviconGeneratorPage"));
const DutchPayPage = lazy(() => import("./pages/DutchPayPage"));
const UnitConverterPage = lazy(() => import("./pages/UnitConverterPage"));
const NoiseGeneratorPage = lazy(() => import("./pages/NoiseGeneratorPage"));
const MockDataGeneratorPage = lazy(() => import("./pages/MockDataGeneratorPage"));
const UrlParserPage = lazy(() => import("./pages/UrlParserPage"));
const JwtDebuggerPage = lazy(() => import("./pages/JwtDebuggerPage"));
const UniversalDataInspectorPage = lazy(() => import("./pages/UniversalDataInspectorPage"));
const WorldTimePage = lazy(() => import("./pages/WorldTimePage"));
const ImageOptimizerPage = lazy(() => import("./pages/ImageOptimizerPage"));
const QrGeneratorPage = lazy(() => import("./pages/QrGeneratorPage"));
const SvgPathVisualizerPage = lazy(() => import("./pages/SvgPathVisualizerPage"));
const RegexTesterPage = lazy(() => import("./pages/RegexTesterPage"));
const ColorPalettePage = lazy(() => import("./pages/ColorPalettePage"));
const PasswordGeneratorPage = lazy(() => import("./pages/PasswordGeneratorPage"));

const githubUrl = "https://github.com/xitora";
type Navigate = (path: string) => void;

const pageVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.5, ease: "easeOut" as const } },
  exit: { opacity: 0, transition: { duration: 0.3, ease: "easeIn" as const } }
};

const staggerContainer = {
  initial: {},
  animate: { transition: { staggerChildren: 0.08 } }
};

const fadeUp = {
  initial: { opacity: 0 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } }
};

const bentoVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } }
};

function PageBackdrop() {
  return <div className="page-backdrop" />;
}


function InternalLink({
  href,
  children,
  className = "",
  onNavigate,
}: {
  href: string;
  children: ReactNode;
  className?: string;
  onNavigate: Navigate;
}) {
  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    onNavigate(href);
  };
  return (
    <a href={href} onClick={handleClick} className={className}>
      {children}
    </a>
  );
}

function Mark({ onNavigate }: { onNavigate: Navigate }) {
  return (
    <div className="mark" onClick={() => onNavigate("/")}>
      <div className="mark__avatar">
          <img src="/assets/profile-art.png" alt="xitora" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
        </div>
      <span className="mark__word">xitora</span>
    </div>
  );
}

function Topbar({ path, onNavigate }: { path: string; onNavigate: Navigate }) {
  const isPostsActive = path.startsWith('/post') || path === '/markdownguide';
  const isProjectsActive = path.split("?")[0] === "/projects";
  const isToolsActive = path.startsWith('/tools');
  const isSettingsActive = path.startsWith('/setting');
  const isContactActive = path.startsWith('/contact');

  return (
    <header className="topbar">
      <div className="topbar__identity">
        <Mark onNavigate={onNavigate} />
      </div>
      <nav aria-label="메인 메뉴">
        <InternalLink href="/posts" onNavigate={onNavigate} className={`nav-link ${isPostsActive ? "active" : ""}`}>
          포스트
        </InternalLink>
        <InternalLink href="/projects" onNavigate={onNavigate} className={`nav-link ${isProjectsActive ? "active" : ""}`}>
          프로젝트
        </InternalLink>
        <InternalLink href="/tools" onNavigate={onNavigate} className={`nav-link ${isToolsActive ? "active" : ""}`}>
          도구
        </InternalLink>
        <InternalLink href="/settings" onNavigate={onNavigate} className={`nav-link ${isSettingsActive ? "active" : ""}`}>
          인게임 설정
        </InternalLink>
        <InternalLink href="/contact" onNavigate={onNavigate} className={`nav-link ${isContactActive ? "active" : ""}`}>
          연락처
        </InternalLink>
      </nav>
      {/* 상단바 좌우 시각적 무게감 대칭을 위한 스페이서 */}
      <div className="topbar__spacer" aria-hidden="true" />
    </header>
  );
}

function Breadcrumbs({ path, onNavigate }: { path: string, onNavigate: Navigate }) {
  const pathname = path.split('?')[0];
  // 모든 도구 페이지는 자체 FloatingToolHeader 알약을 보유하므로 상단 브레드크럼 알약과의 중복 겹침을 방지합니다.
  if (pathname.startsWith('/tools/')) return null;
  const isPostDetail = pathname.startsWith('/post/') || (pathname.startsWith('/posts/') && pathname.split('/').length > 2);
  const isSettingsDetail = pathname.startsWith('/settings/') && pathname.split('/').length > 2;
  const isSubcategory = isPostDetail || isSettingsDetail || pathname === '/markdownguide';

  const crumbs: { label: string, href?: string }[] = [];

  if (isPostDetail) {
    const id = pathname.split('/')[2];
    const post = mockPosts.find(p => p.id === id);
    crumbs.push({ label: '포스트', href: '/posts' });
    if (post) {
      crumbs.push({ label: `[${post.category}] ${post.title}` });
    }
  } else if (isSettingsDetail) {
    const id = pathname.split('/')[2];
    const game = gameSettings.find(g => g.index === id || g.index.replace(/^0+/, '') === id);
    crumbs.push({ label: '인게임 설정', href: '/settings' });
    if (game) {
      crumbs.push({ label: game.game });
    }
  } else if (pathname === '/markdownguide') {
    crumbs.push({ label: '포스트', href: '/posts' });
    crumbs.push({ label: '마크다운 가이드' });
  }

  // 화면 너비에 따른 슬라이드 방향 결정
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 640;

  // 데스크탑은 위로, 모바일은 아래로 숨김
  const hiddenY = isMobile ? 100 : -100;

  return (
    <AnimatePresence>
      {isSubcategory && (
        <motion.div
          className="breadcrumbs-container"
          initial={{ opacity: 0, y: hiddenY, x: "-50%" }}
          animate={{ opacity: 1, y: 0, x: "-50%" }}
          exit={{ opacity: 0, y: hiddenY, x: "-50%" }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          
        >
          {crumbs.map((crumb, idx) => {
            const isLast = idx === crumbs.length - 1;
            return (
              <span key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {idx > 0 && <span className="breadcrumb-separator"><ChevronRight size={14} /></span>}
                <button className="breadcrumb-link" onClick={() => crumb.href && onNavigate(crumb.href)} disabled={!crumb.href}>
                  <span className={isLast ? "breadcrumb-current" : ""}>{crumb.label}</span>
                </button>
              </span>
            );
          })}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function MobileFloatingNav({ path, onNavigate }: { path: string; onNavigate: Navigate }) {
  const pathname = path.split('?')[0];
  const isPostsActive = pathname.startsWith('/post') || pathname === '/markdownguide';
  const isProjectsActive = path.split("?")[0] === "/projects";
  const isToolsActive = pathname.startsWith('/tools');
  const isSettingsActive = pathname.startsWith('/setting');
  const isContactActive = pathname.startsWith('/contact');

  return (
    <nav className="mobile-floating-nav" aria-label="모바일 메뉴">
      <InternalLink href="/" onNavigate={onNavigate} className={`m-nav-item ${pathname === "/" ? "active" : ""}`}>
        <User size={20} />
        <span>홈</span>
      </InternalLink>
      <InternalLink href="/posts" onNavigate={onNavigate} className={`m-nav-item ${isPostsActive ? "active" : ""}`}>
        <Hash size={20} />
        <span>포스트</span>
      </InternalLink>
      <InternalLink href="/projects" onNavigate={onNavigate} className={`m-nav-item ${isProjectsActive ? "active" : ""}`}>
        <FolderOpen size={20} />
        <span>프로젝트</span>
      </InternalLink>
      <InternalLink href="/tools" onNavigate={onNavigate} className={`m-nav-item ${isToolsActive ? "active" : ""}`}>
        <Wrench size={20} />
        <span>도구</span>
      </InternalLink>
      <InternalLink href="/settings" onNavigate={onNavigate} className={`m-nav-item ${isSettingsActive ? "active" : ""}`}>
        <Settings size={20} />
        <span>설정</span>
      </InternalLink>
      <InternalLink href="/contact" onNavigate={onNavigate} className={`m-nav-item ${isContactActive ? "active" : ""}`}>
        <MessageCircle size={20} />
        <span>연락처</span>
      </InternalLink>
    </nav>
  );
}

function Footer({ path, onScrollTop }: { path: string; onScrollTop: () => void }) {
  return (
    <footer className="page-footer">
      <span>© 2026 xitora.cc</span>
      <button onClick={onScrollTop} className="flex-center">
        맨 위로 <ArrowUpRight size={14} style={{ transform: 'rotate(-45deg)' }} />
      </button>
    </footer>
  );
}

function HomePage({ onNavigate }: { onNavigate: Navigate }) {
  return (
    <motion.main className="bento-container" variants={pageVariants} initial="initial" animate="animate" exit="exit">
      <motion.div className="bento-grid" variants={staggerContainer} initial="initial" animate="animate">

        {/* 메인 배너 */}
          <motion.div className="bento-box bento-hero-merged" variants={fadeUp} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-start', position: 'relative', overflow: 'hidden', minHeight: '220px' }}>
            <div className="bento-content" style={{ zIndex: 2, position: 'relative', textAlign: 'left' }}>
              <h1 className="hero-title">xitora</h1>
              <p className="hero-desc">FPS, 리듬 게임 위주로 플레이하는 유저입니다.</p>
            </div>
            
            
          </motion.div>

          {/* 최근 포스트 */}
        <motion.div className="bento-box bento-about bento-recent-posts" variants={fadeUp} onClick={() => onNavigate('/posts')} style={{ cursor: 'pointer' }}>
          <div className="bento-header">
            <Hash size={20} />
            <span>최근 포스트</span>
          </div>
          <div className="recent-posts-list">
            {[...Array(5)].map((_, i) => {
              const post = mockPosts[i];
              if (post) {
                return (
                  <div className="recent-post-item" key={post.id} onClick={(e) => { e.stopPropagation(); onNavigate('/post/' + post.id); }}>
                    <span className="recent-post-category">{post.category}</span>
                    <span className="recent-post-title">{post.title}</span>
                    <span className="recent-post-date">{post.date.split("T")[0]}</span>
                  </div>
                );
              } else {
                return (
                  <div className="recent-post-item empty-post" key={"empty-" + i}>
                    <span className="recent-post-category">---</span>
                    <span className="recent-post-title" style={{ color: 'var(--text-muted)' }}>새로운 글을 기다려주세요!</span>
                    <span className="recent-post-date">--/--/--</span>
                  </div>
                );
              }
            })}
          </div>
          <div className="bento-arrow"><ArrowUpRight size={24} /></div>
        </motion.div>

        {/* 도구 */}
        <motion.div className="bento-box bento-nav bento-nav--tools" variants={fadeUp} onClick={() => onNavigate('/tools')} style={{ cursor: 'pointer' }}>
          <div className="bento-header">
            <Wrench size={20} />
            <span>도구</span>
          </div>
          <div style={{ marginTop: 'auto' }}>
            <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.95rem' }}>포맷 변환, 이미지 최적화, 개발 도구</p>
          </div>
          <div className="bento-arrow"><ArrowUpRight size={24} /></div>
        </motion.div>

        {/* 인게임 설정 */}
        <motion.div className="bento-box bento-nav bento-nav--settings" variants={fadeUp} onClick={() => onNavigate('/settings')} style={{ cursor: 'pointer' }}>
          <div className="bento-header">
              <Settings size={20} />
              <span>인게임 설정</span>
            </div>
            <div style={{ marginTop: 'auto' }}>
              <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.95rem' }}>마우스, 화면, 인게임 키 세팅</p>
            </div>
          <div className="bento-arrow"><ArrowUpRight size={24} /></div>
        </motion.div>

        {/* 연락처 */}
        <motion.div className="bento-box bento-nav bento-nav--contact" variants={fadeUp} onClick={() => onNavigate('/contact')} style={{ cursor: 'pointer' }}>
          <div className="bento-header">
              <MessageCircle size={20} />
              <span>연락처</span>
            </div>
            <div style={{ marginTop: 'auto' }}>
              <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.95rem' }}>SNS 및 커뮤니티 채널</p>
            </div>
          <div className="bento-arrow"><ArrowUpRight size={24} /></div>
        </motion.div>

        {/* 사용중인 장비 */}
        <motion.div className="bento-box bento-gear" variants={fadeUp}>
          <div className="bento-header">
            <Monitor size={20} />
            <span>사용중인 장비</span>
          </div>
          <div className="gear-bento-list">
            {gearItems.map((item) => (
              <div className="gear-bento-item" key={item.name}>
                <div className="gear-bento-category">{item.category}</div>
                <div className="gear-bento-content">
                  <h4 className="gear-bento-name">{item.name}</h4>
                  {item.detail && item.detail !== "-" && (
                    item.detail.split("\n").map((line, idx) => (
                      <p className="gear-bento-desc" key={idx}>{line}</p>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </motion.main>
  );
}

function SettingsPage({ onNavigate, gameId }: { onNavigate: Navigate; gameId?: string }) {
  if (gameId) {
    const item = gameSettings.find(g => g.index === gameId);
    if (!item) return <div style={{ padding: '100px 20px', textAlign: 'center' }}>404 Not Found</div>;

    // Group the settings by category
    const groups: { title: string, items: { label: string, value: string }[] }[] = [];
    let currentGroup = { title: '', items: [] as { label: string, value: string }[] };

    item.values.forEach(([label, value]) => {
      if (!label && !value) return;
      if (!value) {
        if (currentGroup.items.length > 0 || currentGroup.title) {
          groups.push(currentGroup);
        }
        currentGroup = { title: label, items: [] };
      } else {
        currentGroup.items.push({ label, value });
      }
    });
    if (currentGroup.items.length > 0 || currentGroup.title) {
      groups.push(currentGroup);
    }

    return (
      <motion.div className="page-layout post-detail-layout" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
        <aside className="post-sidebar post-sidebar-left"></aside>

        <div className="post-detail-container">
          <button onClick={() => onNavigate('/settings')} className="back-btn" style={{ marginBottom: 24 }}>
            <ChevronLeft size={20} /> 목록으로
          </button>

          <motion.div className="list-header" style={{ marginBottom: 40, textAlign: 'left' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}>
            <h1 style={{ fontSize: '2.5rem', margin: '0 0 12px', letterSpacing: '-0.04em' }}>{item.game}</h1>
            <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)', margin: 0 }}>{item.note}</p>
          </motion.div>

          <motion.div variants={staggerContainer} initial="initial" animate="animate">
            {groups.map((g, i) => (
              <motion.div key={i} variants={fadeUp} style={{ marginBottom: 40 }}>
                {g.title && (
                  <h3 style={{ fontSize: '1.2rem', color: 'var(--text-main)', marginBottom: '16px', fontWeight: 600 }}>
                    {g.title}
                  </h3>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
                  {g.items.map((prop, j) => (
                    <div key={j} style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                      borderRadius: '16px',
                      padding: '16px 20px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{prop.label}</span>
                      <strong style={{ fontSize: '1.05rem', color: 'var(--text-main)', overflowWrap: 'anywhere', fontWeight: 500 }}>{prop.value}</strong>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>

        <aside className="post-sidebar post-sidebar-right"></aside>
      </motion.div>
    );
  }

  // List view
  return (
    <motion.div className="page-layout post-detail-layout" variants={pageVariants} initial="initial" animate="animate" exit="exit">
      <aside className="post-sidebar post-sidebar-left"></aside>

      <div className="post-detail-container">
        <button className="back-btn" onClick={() => onNavigate('/')} style={{ marginBottom: 24 }}>
          <ChevronLeft size={20} /> 메인으로
        </button>

        <motion.div className="list-header" style={{ marginBottom: 40, textAlign: 'left' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}>
          <h1 style={{ fontSize: '2.5rem', margin: '0 0 12px', letterSpacing: '-0.04em', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Settings size={36} />
            인게임 설정
          </h1>
        </motion.div>

        <motion.div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px', marginTop: '16px' }} variants={staggerContainer} initial="initial" animate="animate">
          {gameSettings.map((item) => (
            <motion.div
              key={item.index}
              className="item-card item-card--interactive"
              variants={fadeUp}
              onClick={() => onNavigate('/settings/' + item.index)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--accent)', fontWeight: 600 }}>{item.index}</span>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-main)', margin: 0 }}>{item.game}</h3>
                </div>
                <div className="item-card-arrow">
                  <ArrowUpRight size={20} />
                </div>
              </div>
              {item.note && item.note !== '-' && (
                <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', margin: 0, marginTop: '8px' }}>{item.note}</p>
              )}
            </motion.div>
          ))}
        </motion.div>
      </div>

      <aside className="post-sidebar post-sidebar-right"></aside>
    </motion.div>
  );
}

function ContactCard({ item }: { item: ContactItem }) {
  const [copied, setCopied] = useState(false);

  const getIcon = (name: string) => {
    switch (name) {
      case "GitHub": return <SiGithub size={24} />;
      case "Discord": return <SiDiscord size={24} />;
      case "X": return <SiX size={24} />;
      case "Youtube": return <SiYoutube size={24} />;
      case "Kakao": return <SiKakaotalk size={24} />;
      case "Steam": return <SiSteam size={24} />;
      case "Riot": return <SiRiotgames size={24} />;
      case "Spotify": return <SiSpotify size={24} />;
      case "Telegram": return <SiTelegram size={24} />;
      case "Mail": return <Mail size={24} />;
      case "Chunithm":
      case "Maimai":
      case "Sekai":
      case "BlueArchive": return <Gamepad2 size={24} />;
      default: return <User size={24} />;
    }
  };

  const handleCopy = (e: React.MouseEvent) => {
    if (item.kind === 'link') return;
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(item.value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const innerContent = (
    <div className={`contact-card ${copied ? 'contact-card--copied' : ''}`} style={{ '--card-color': item.color } as React.CSSProperties}>
      <div className="contact-card__icon" style={{ backgroundColor: item.color + "20", color: item.color }}>
        {getIcon(item.icon)}
      </div>
      <div className="contact-card__info">
        <span className="contact-card__title">{item.label}</span>
        <span className="contact-card__value">
          {copied ? (
            <span className="contact-card__copied-badge">
              클립보드에 복사됨!
            </span>
          ) : (
            item.value
          )}
        </span>
      </div>
      <div className="contact-card__action">
        {item.kind === 'copy' ? (
          <button className="contact-card__copy-btn" onClick={(e) => { e.preventDefault(); handleCopy(e); }}>
            {copied ? <Check size={16} color="#10b981" /> : <Copy size={16} />}
          </button>
        ) : (
          <ArrowUpRight size={18} />
        )}
      </div>
    </div>
  );

  if (item.kind === 'link') {
    return (
      <a href={item.href} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
        {innerContent}
      </a>
    );
  }

  return <div style={{ cursor: 'pointer', textDecoration: 'none' }} onClick={handleCopy}>{innerContent}</div>;
}

function ContactPage({ onNavigate }: { onNavigate: Navigate }) {
  const groupedContacts = contacts.reduce((acc, curr) => {
    if (!acc[curr.category]) acc[curr.category] = [];
    acc[curr.category].push(curr);
    return acc;
  }, {} as Record<string, ContactItem[]>);

  return (
    <motion.div className="page-layout post-detail-layout" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
      <aside className="post-sidebar post-sidebar-left"></aside>
      <div className="post-detail-container">
        <button onClick={() => onNavigate('/')} className="back-btn" style={{ marginBottom: 24 }}>
          <ChevronLeft size={20} /> 메인으로
        </button>
        <motion.div className="list-header" style={{ marginBottom: 40, textAlign: 'left' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}>
          <h1 style={{ fontSize: '2.5rem', margin: '0 0 12px', letterSpacing: '-0.04em', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <MessageCircle size={36} />
            연락처
          </h1>
        </motion.div>

        <motion.div className="contact-groups" variants={staggerContainer} initial="initial" animate="animate">
          {Object.entries(groupedContacts).map(([category, items]) => (
            <motion.div key={category} className="contact-group" variants={fadeUp} style={{ marginBottom: 48 }}>
              <h2 className="contact-group__title" style={{ fontSize: '1.2rem', marginBottom: '16px', color: 'var(--text-main)' }}>{category}</h2>
              <div className="contact-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                {items.map((item, idx) => (
                  <ContactCard key={item.label} item={item} />
                ))}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
      <aside className="post-sidebar post-sidebar-right"></aside>
    </motion.div>
  );
}

// 비동기 라우트 청크 로딩 시 표시되는 글래스 스피너 컴포넌트
function PageLoadingFallback() {
  return (
    <div
      style={{
        minHeight: "60vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          border: "2px solid rgba(1, 74, 255, 0.2)",
          borderTopColor: "#0395FC",
          animation: "pageSpin 0.8s linear infinite",
        }}
      />
      <style>{`
        @keyframes pageSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      <span style={{ fontSize: "0.85rem", color: "#888" }}>페이지를 불러오는 중...</span>
    </div>
  );
}

function BackTutorial({ path }: { path: string }) {
  const [visible, setVisible] = useState(false);
  const pathname = path.split('?')[0];

  useEffect(() => {
    try {
      if (pathname !== '/' && !localStorage.getItem('tutorial_back_click')) {
        const timer = setTimeout(() => setVisible(true), 1500);
        return () => clearTimeout(timer);
      }
    } catch {
      // localStorage 접근 차단 환경 방어
    }
  }, [pathname]);

  const handleDismiss = () => {
    try {
      localStorage.setItem('tutorial_back_click', 'true');
    } catch {
      // 무시
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      id="back-tutorial"
      className="back-tutorial"
      onClick={handleDismiss}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') handleDismiss();
      }}
      title="클릭하여 닫기"
      style={{ cursor: 'pointer' }}
    >
      <div className="back-tutorial-content">
        <ArrowLeft size={20} className="pulse-anim" />
        <span>스와이프하여 뒤로 가기 (클릭하여 닫기)</span>
      </div>
    </div>
  );
}

// 마크다운에서 본문 발췌문 추출 함수
function getPostExcerpt(markdown: string, maxLength = 130): string {
  if (!markdown) return "";
  try {
    const cleaned = markdown
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/\[(?:LinkWidget|FileWidget):.*?\]\(.*?\)/gi, "")
      .replace(/!\[.*?\]\(.*?\)/g, "")
      .replace(/\[(.*?)\]\(.*?\)/g, "$1")
      .replace(/<[^>]+>/g, "")
      .replace(/(?:^|\n)\s*#{1,6}\s+/g, " ")
      .replace(/(\*\*|__)(.*?)\1/g, "$2")
      .replace(/(\*|_)(.*?)\1/g, "$2")
      .replace(/~~(.*?)~~/g, "$1")
      .replace(/(?:^|\n)\s*>\s*/g, " ")
      .replace(/(?:^|\n)\s*[-*+]\s+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (cleaned.length <= maxLength) return cleaned;
    return cleaned.slice(0, maxLength).trim() + "...";
  } catch {
    return "";
  }
}

function currentPath() {
  return (window.location.pathname.replace(/\/+$/, "") || "/") + window.location.search;
}

function App() {
  const [path, setPath] = useState(currentPath());
  const lenisRef = useRef<Lenis | null>(null);

  // 페이지별 미리보기 메타 태그 및 브라우저 타이틀 동적 업데이트
  useEffect(() => {
    try {
      const currentPathname = path.split("?")[0];
      let pageTitle = "메인 페이지";
      let pageDescription = "";
      let pageImage = "https://xitora.cc/assets/profile-art.png";

      if (currentPathname === "/" || currentPathname === "") {
        pageTitle = "메인 페이지";
        pageDescription = "xitora의 개인 웹사이트. 기술 블로그 포스트, 유용한 웹 기반 도구 모음 및 인게임 설정 정보를 제공합니다.";
      } else if (currentPathname === "/posts") {
        pageTitle = "게시글 목록";
        pageDescription = "개발, 일상, 유용한 정보와 기술 팁을 다루는 xitora의 블로그 포스트 목록입니다.";
      } else if (currentPathname.startsWith("/post/") || (currentPathname.startsWith("/posts/") && currentPathname.split("/").length > 2)) {
        const id = currentPathname.split("/")[2];
        const post = mockPosts.find((p) => p.id === id);
        if (post) {
          pageTitle = `[${post.category}] ${post.title}`;
          pageDescription = getPostExcerpt(post.content);
          if (post.bannerImg) {
            pageImage = post.bannerImg.startsWith("http")
              ? post.bannerImg
              : `https://xitora.cc${post.bannerImg.startsWith("/") ? "" : "/"}${post.bannerImg}`;
          }
        } else {
          pageTitle = "게시글";
        }
      } else if (currentPathname === "/projects") {
        pageTitle = "프로젝트";
        pageDescription = "직접 만들고 운영하는 로얄상구 대여 예약과 츄니토라를 소개합니다.";
      } else if (currentPathname === "/tools") {
        pageTitle = "도구 목록";
        pageDescription = "포맷 변환, 이미지 최적화, 세계 시간, QR 코드, 색상 팔레트, 정규식 도구를 제공합니다.";
      } else if (currentPathname.startsWith("/tools/")) {
        const toolId = currentPathname.replace("/tools/", "");
        const tool = toolsList.find((t) => t.id === toolId);
        if (tool) {
          pageTitle = tool.title;
          pageDescription = tool.description;
        } else {
          pageTitle = "도구";
        }
      } else if (currentPathname.startsWith("/settings/") && currentPathname.split("/").length > 2) {
        const id = currentPathname.split("/")[2];
        const game = gameSettings.find((g) => g.index === id || g.index.replace(/^0+/, "") === id);
        pageTitle = game ? `${game.game} 인게임 설정` : "인게임 설정";
        pageDescription = game ? `${game.game}의 감도, DPI, 조준선, 그래픽 품질 및 주요 세부 인게임 설정 값입니다.` : "";
      } else if (currentPathname === "/settings" || currentPathname.startsWith("/settings")) {
        pageTitle = "인게임 설정 목록";
        pageDescription = "발로란트, 레인보우 식스 시즈, 디제이맥스 등 플레이하는 게임들의 DPI, 감도 및 그래픽 설정 모음입니다.";
      } else if (currentPathname.startsWith("/contact")) {
        pageTitle = "연락처";
        pageDescription = "xitora와의 소통을 위한 이메일, GitHub, Discord, SNS 등 연락처 링크 모음입니다.";
      } else if (currentPathname === "/markdownguide") {
        pageTitle = "마크다운 가이드";
        pageDescription = "웹사이트에서 지원하는 마크다운 서식, 위젯(LinkWidget, FileWidget) 및 코드 하이라이트 작성 가이드입니다.";
      }

      document.title = pageTitle;

      const setMeta = (nameOrProp: string, content: string, isProp = false) => {
        const selector = isProp ? `meta[property="${nameOrProp}"]` : `meta[name="${nameOrProp}"]`;
        let el = document.querySelector(selector) as HTMLMetaElement | null;
        if (!el) {
          el = document.createElement("meta");
          if (isProp) el.setAttribute("property", nameOrProp);
          else el.setAttribute("name", nameOrProp);
          document.head.appendChild(el);
        }
        el.setAttribute("content", content);
      };

      const removeMeta = (nameOrProp: string, isProp = false) => {
        const selector = isProp ? `meta[property="${nameOrProp}"]` : `meta[name="${nameOrProp}"]`;
        const el = document.querySelector(selector);
        if (el) el.remove();
      };

      setMeta("og:title", pageTitle, true);
      setMeta("twitter:title", pageTitle);
      setMeta("og:site_name", "xitora.cc", true);
      setMeta("og:url", `https://xitora.cc${currentPathname}`, true);
      setMeta("og:image", pageImage, true);
      setMeta("twitter:image", pageImage);
      setMeta("twitter:card", "summary_large_image");

      if (pageDescription) {
        setMeta("description", pageDescription);
        setMeta("og:description", pageDescription, true);
        setMeta("twitter:description", pageDescription);
      } else {
        removeMeta("description");
        removeMeta("og:description", true);
        removeMeta("twitter:description");
      }
    } catch (e) {
      console.error("Failed to update page meta:", e);
    }
  }, [path]);

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
    });
    lenisRef.current = lenis;
    (window as any).__lenis = lenis;

    let rafId: number;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      (window as any).__lenis = null;
      lenis.destroy();
    };
  }, []);

  // 페이지 이동 시 즉각 최상단 스크롤 규칙 적용
  useEffect(() => {
    const scrollToTop = () => {
      if (lenisRef.current) {
        lenisRef.current.scrollTo(0, { immediate: true });
      }
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };

    scrollToTop();
    const rafId = requestAnimationFrame(scrollToTop);
    const timer = setTimeout(scrollToTop, 50);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timer);
    };
  }, [path]);

  useEffect(() => {
    const onPopState = () => {
      flushSync(() => {
        setPath(currentPath());
      });
      if (lenisRef.current) {
        lenisRef.current.scrollTo(0, { immediate: true });
      }
      window.scrollTo(0, 0);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const navigate = useCallback((newPath: string) => {
    if (newPath === currentPath()) {
      if (lenisRef.current) {
        lenisRef.current.scrollTo(0, { immediate: true });
      }
      window.scrollTo(0, 0);
      return;
    }
    window.history.pushState({}, "", newPath);
    flushSync(() => {
      setPath(newPath);
    });
    if (lenisRef.current) {
      lenisRef.current.scrollTo(0, { immediate: true });
    }
    window.scrollTo(0, 0);
  }, []);

  const pathname = path.split('?')[0];
  const isSettingsPage = pathname.startsWith("/settings");
  const isSettingsDetail = isSettingsPage && pathname.split('/').length > 2;
  const isContactPage = pathname.startsWith("/contact");
  const isPostList = pathname === "/posts";
  const isMarkdownGuide = pathname === "/markdownguide";
  const isPostDetail = pathname.startsWith("/post/") || (pathname.startsWith("/posts/") && pathname.split('/').length > 2);
  const isToolsList = pathname === "/tools";
  const isCssEasingSandbox = pathname === "/tools/css-easing-sandbox";
  const isCurlConverter = pathname === "/tools/curl-converter";
  const isFaviconGenerator = pathname === "/tools/favicon-generator";
  const isDutchPay = pathname === "/tools/dutch-pay-calculator";
  const isUnitConverter = pathname === "/tools/unit-currency-converter";
  const isNoiseGenerator = pathname === "/tools/noise-generator";
  const isMockDataGenerator = pathname === "/tools/mock-data-generator";
  const isJwtDebugger = pathname === "/tools/jwt-debugger";
  const isDataInspector = pathname === "/tools/data-inspector";
  const isWorldTime = pathname === "/tools/world-time";
  const isImageOptimizer = pathname === "/tools/image-optimizer";
  const isQrGenerator = pathname === "/tools/qr-generator";
  const isSvgPathVisualizer = pathname === "/tools/svg-path-visualizer";
  const isUrlParser = pathname === "/tools/url-parser";
  const isRegexTester = pathname === "/tools/regex-tester";
  const isColorPalette = pathname === "/tools/color-palette";
  const isPasswordGenerator = pathname === "/tools/password-generator";

  let contentNode: React.ReactNode;

  if (isPostList) {
    contentNode = <PostListPage key="post-list" onNavigate={navigate} currentPath={path} />;
  } else if (pathname === "/projects") {
    contentNode = <ProjectsPage key="projects" onNavigate={navigate} />;
  } else if (isMarkdownGuide) {
    contentNode = <MarkdownGuidePage key="markdown-guide" onNavigate={navigate} />;
  } else if (isPostDetail) {
    const postId = pathname.split("/")[2];
    contentNode = <PostDetailPage key="post-detail" id={postId} onNavigate={navigate} />;
  } else if (isCssEasingSandbox) {
    contentNode = <CssEasingSandboxPage key="css-easing-sandbox" onNavigate={navigate} />;
  } else if (isCurlConverter) {
    contentNode = <CurlConverterPage key="curl-converter" onNavigate={navigate} />;
  } else if (isFaviconGenerator) {
    contentNode = <FaviconGeneratorPage key="favicon-generator" onNavigate={navigate} />;
  } else if (isDutchPay) {
    contentNode = <DutchPayPage key="dutch-pay-calculator" onNavigate={navigate} />;
  } else if (isUnitConverter) {
    contentNode = <UnitConverterPage key="unit-currency-converter" onNavigate={navigate} />;
  } else if (isNoiseGenerator) {
    contentNode = <NoiseGeneratorPage key="noise-generator" onNavigate={navigate} />;
  } else if (isMockDataGenerator) {
    contentNode = <MockDataGeneratorPage key="mock-data-generator" onNavigate={navigate} />;
  } else if (isJwtDebugger) {
    contentNode = <JwtDebuggerPage key="jwt-debugger" onNavigate={navigate} />;
  } else if (isDataInspector) {
    contentNode = <UniversalDataInspectorPage key="data-inspector" onNavigate={navigate} />;
  } else if (isWorldTime) {
    contentNode = <WorldTimePage key="world-time" onNavigate={navigate} />;
  } else if (isImageOptimizer) {
    contentNode = <ImageOptimizerPage key="image-optimizer" onNavigate={navigate} />;
  } else if (isQrGenerator) {
    contentNode = <QrGeneratorPage key="qr-generator" onNavigate={navigate} />;
  } else if (isSvgPathVisualizer) {
    contentNode = <SvgPathVisualizerPage key="svg-path-visualizer" onNavigate={navigate} />;
  } else if (isUrlParser) {
    contentNode = <UrlParserPage key="url-parser" onNavigate={navigate} />;
  } else if (isRegexTester) {
    contentNode = <RegexTesterPage key="regex-tester" onNavigate={navigate} />;
  } else if (isColorPalette) {
    contentNode = <ColorPalettePage key="color-palette" onNavigate={navigate} />;
  } else if (isPasswordGenerator) {
    contentNode = <PasswordGeneratorPage key="password-generator" onNavigate={navigate} />;
  } else if (isToolsList) {
    contentNode = <ToolsListPage key="tools-list" onNavigate={navigate} currentPath={path} />;
  } else if (isSettingsDetail) {
    const gameId = pathname.split('/')[2];
    contentNode = <SettingsPage key="settings-detail" onNavigate={navigate} gameId={gameId} />;
  } else if (isSettingsPage) {
    contentNode = <SettingsPage key="settings-list" onNavigate={navigate} />;
  } else if (isContactPage) {
    contentNode = <ContactPage key="contact" onNavigate={navigate} />;
  } else {
    contentNode = <HomePage key="home" onNavigate={navigate} />;
  }

  return (
    <>
      <PageBackdrop />
      <div className="app-layout">
        <div className="gradient-mesh" />
        <Topbar path={path} onNavigate={navigate} />
        <div className="main-scroll-area">
          <Breadcrumbs path={path} onNavigate={navigate} />
          <AnimatePresence mode="wait" onExitComplete={() => window.scrollTo(0, 0)}>
            <Suspense fallback={<PageLoadingFallback />}>
              {contentNode}
            </Suspense>
          </AnimatePresence>
          <Footer path={path} onScrollTop={() => window.scrollTo({ top: 0, behavior: "smooth" })} />
        </div>
        <MobileFloatingNav path={path} onNavigate={navigate} />
        <BackTutorial path={path} />
      </div>
    </>
  );
}

export default App;



