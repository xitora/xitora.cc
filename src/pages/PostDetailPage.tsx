import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { CodeBlock } from '../components/CodeBlock';
import { FileWidget, LinkWidget, PostImage } from '../data/posts';
import React, { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ExternalLink } from 'lucide-react';
import { mockPosts, categories } from '../data/posts';

interface PostDetailPageProps {
  id: string;
  onNavigate: (path: string) => void;
}

export default function PostDetailPage({ id, onNavigate }: PostDetailPageProps) {
  const post = useMemo(() => mockPosts.find(p => p.id === id), [id]);

  useEffect(() => {
    // Scroll to top when opening post
    window.scrollTo(0, 0);
  }, []);

  if (!post) {
    return (
      <div className="page-layout post-detail-layout">
        <div className="post-detail-container text-center">
          <h2>게시물을 찾을 수 없습니다.</h2>
          <button className="back-btn" onClick={() => onNavigate('/posts')}>
            <ChevronLeft size={20} /> 목록으로
          </button>
        </div>
      </div>
    );
  }

  // Format Date: 0000-00-00 오전/오후 0:00 (요일)
  const formattedDate = useMemo(() => {
    const d = new Date(post.date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    
    let hours = d.getHours();
    const ampm = hours >= 12 ? '오후' : '오전';
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 should be 12
    const minutes = String(d.getMinutes()).padStart(2, '0');
    
    const weekDays = ['일', '월', '화', '수', '목', '금', '토'];
    const weekDay = weekDays[d.getDay()];

    return `${year}-${month}-${day} ${ampm} ${hours}:${minutes} (${weekDay})`;
  }, [post.date]);

  // Extract headings for TOC
  const [headings, setHeadings] = React.useState<{ id: string, text: string, level: number }[]>([]);
  const [activeId, setActiveId] = React.useState<string>('');

  useEffect(() => {
    const timer = setTimeout(() => {
      const article = document.querySelector('.post-article-body');
      if (!article) return;
      const elements = article.querySelectorAll('h1, h2, h3');
      const newHeadings = Array.from(elements).map((el, index) => {
        if (!el.id) el.id = `heading-${index}`;
        return {
          id: el.id,
          text: el.textContent || '',
          level: parseInt(el.tagName[1])
        };
      });
      setHeadings(newHeadings);
    }, 100);
    return () => clearTimeout(timer);
  }, [post]);

  useEffect(() => {
    if (headings.length === 0) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setActiveId(entry.target.id);
        }
      });
    }, { rootMargin: '0px 0px -80% 0px' });
    
    headings.forEach(h => {
      const el = document.getElementById(h.id);
      if (el) observer.observe(el);
    });
    
    return () => observer.disconnect();
  }, [headings]);

  const categoryCounts = useMemo(() => {
    return categories.map((cat: string) => ({
      name: cat,
      count: cat === 'All' ? mockPosts.length : mockPosts.filter(p => p.category === cat).length
    }));
  }, []);

  return (
    <motion.div className="page-layout post-detail-layout" initial="initial" animate="animate" exit="exit" variants={{
      initial: { opacity: 0 },
      animate: { opacity: 1, transition: { duration: 0.5, ease: "easeOut" as const } },
      exit: { opacity: 0, transition: { duration: 0.3, ease: "easeIn" as const } }
    }}>
      <aside className="post-sidebar post-sidebar-left">
        <div className="sidebar-sticky">
          <h3 className="sidebar-title">카테고리</h3>
          <ul className="category-list">
            {categoryCounts.map((c: any) => (
              <li key={c.name} className={c.name === post.category ? 'active' : ''}>
                <button onClick={() => onNavigate(c.name === 'All' ? '/posts' : `/posts?category=${encodeURIComponent(c.name)}`)}>
                  {c.name} <span className="cat-count">({c.count})</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <div className="post-detail-container">
        <button className="back-btn" onClick={() => onNavigate('/posts')} style={{ marginBottom: 24 }}>
          <ChevronLeft size={20} /> 목록으로
          </button>

        <div className="post-detail-card">
          {post.bannerImg && (
            <div className="post-banner-container">
              <img src={post.bannerImg} alt={post.title} className="post-banner-img" />
            </div>
          )}
          <header className="post-detail-header">
            <span className="post-category-label">{post.category}</span>
            <h1 className="post-title">{post.title}</h1>
            <time className="post-date">{formattedDate}</time>
          </header>

          <article className="post-article-body post-content">
            <Markdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeRaw]}
              components={{
                p(props) {
                  const hasImg = (props as any).node?.children?.some((c: any) => c.tagName === 'img' || c.tagName === 'figure');
                  const children = React.Children.toArray(props.children);
                  const isWidget = children.some((child: any) => {
                    if (React.isValidElement(child)) {
                      if (child.type === 'img' || child.type === 'figure') return true;
                      const childText = String((child as any).props?.children || '');
                      return (
                        childText.startsWith('LinkWidget:') ||
                        childText.startsWith('FileWidget:') ||
                        childText === 'LinkWidget' ||
                        childText === 'FileWidget'
                      );
                    }
                    return false;
                  });
                  if (hasImg || isWidget) {
                    return <div className="post-widget-wrapper">{props.children}</div>;
                  }
                  return <p {...props}>{props.children}</p>;
                },
                code(props) {
                  const {children, className, node, ...rest} = props;
                  const match = /language-(\w+)/.exec(className || '');
                  const meta = node?.data?.meta || '';
                  const extMatch = meta.match(/extension="([^"]+)"/);
                  const extension = extMatch ? extMatch[1] : undefined;
                  return match ? (
                    <CodeBlock language={match[1]} extension={extension} code={String(children).replace(/\n$/, '')} />
                  ) : (
                    <code className={className} {...rest}>{children}</code>
                  );
                },
                img(props) {
                  return <PostImage src={props.src || ''} alt={props.alt || ''} caption={props.title || undefined} />;
                },
                a(props) {
                  const text = String(props.children);
                  if (text.startsWith('FileWidget:')) {
                    const title = text.replace('FileWidget:', '').trim();
                    return <FileWidget title={title || '첨부 파일'} url={props.href || ''} desc={props.title || undefined} />;
                  }
                  if (text.startsWith('LinkWidget:')) {
                    const title = text.replace('LinkWidget:', '').trim();
                    return <LinkWidget title={title || undefined} url={props.href || ''} desc={props.title || undefined} />;
                  }
                  if (text === 'FileWidget') {
                    return <FileWidget title={props.title || '첨부 파일'} url={props.href || ''} desc={props.title || undefined} />;
                  }
                  if (text === 'LinkWidget') {
                    return <LinkWidget title={props.title || undefined} url={props.href || ''} desc={undefined} />;
                  }
                  // 내부 앵커 링크인 경우 페이지 내 이동 유지
                  if (props.href?.startsWith('#')) {
                    return <a href={props.href || ''} title={props.title}>{props.children}</a>;
                  }
                  // 일반 하이퍼링크: 항상 새 탭으로 열기 및 우측 ExternalLink 아이콘 추가
                  return (
                    <a
                      href={props.href || ''}
                      title={props.title}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="post-inline-link"
                    >
                      <span className="post-inline-link__text">{props.children}</span>
                      <span className="post-inline-link__icon" aria-hidden="true">
                        <ExternalLink size={14} />
                      </span>
                    </a>
                  );
                }
              }}
            >
              {post.content}
            </Markdown>
          </article>
        </div>
      </div>

      <aside className="post-sidebar post-sidebar-right">
        <div className="sidebar-sticky">
          <h3 className="sidebar-title">목차</h3>
          {headings.length === 0 ? (
            <p className="no-toc">목차가 없습니다.</p>
          ) : (
            <ul className="toc-list">
              {headings.map(h => (
                <li key={h.id} className={`toc-item toc-level-${h.level} ${activeId === h.id ? 'active' : ''}`}>
                  <a href={`#${h.id}`} onClick={(e) => {
                    e.preventDefault();
                    document.getElementById(h.id)?.scrollIntoView({ behavior: 'smooth' });
                  }}>
                    {h.text}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </motion.div>
  );
}






