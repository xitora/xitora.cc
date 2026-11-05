
import React from 'react';
import { Paperclip, Link as LinkIcon, Download, FileText, Image as ImageIcon } from 'lucide-react';
import { CodeBlock } from '../components/CodeBlock';
export { LinkWidget } from '../components/LinkWidget';

export interface Post {
  id: string;
  title: string;
  category: string;
  date: string; // ISO string for sorting and parsing
  bannerImg: string;
  content: string;
}


// --- Widgets ---

// 기존 LinkWidget은 components/LinkWidget으로 대체됨
const _LegacyLinkWidget = ({ title, url, desc }: { title: string, url: string, desc?: string }) => (
  <a href={url} target="_blank" rel="noreferrer" className="post-widget link-widget">
    <div className="widget-icon-wrapper"><LinkIcon size={20} /></div>
    <div className="widget-info">
      <span className="widget-title">{title}</span>
      {desc && <span className="widget-desc">{desc}</span>}
      <span className="widget-url">{url}</span>
    </div>
  </a>
);

export const FileWidget = ({ title, url, desc }: { title: string, url: string, desc?: string }) => {
  return (
    <a href={url || "#"} target={url ? "_blank" : undefined} rel={url ? "noreferrer" : undefined} className="post-widget file-widget">
      <div className="widget-icon-wrapper"><Paperclip size={20} /></div>
      <div className="widget-info">
        <span className="widget-title">{title}</span>
        {desc && <span className="widget-desc">{desc}</span>}
        <span className="widget-url">{url}</span>
      </div>
      <div className="widget-action action-large"><Download size={24} /></div>
    </a>
  );
};

export const PostImage = ({ src, alt, caption }: { src: string, alt: string, caption?: string }) => (
  <figure className="post-image-figure">
    <img src={src} alt={alt} />
    {caption && <figcaption>{caption}</figcaption>}
  </figure>
);

// Markdown 메타데이터 파싱


function parseFrontmatter(markdown: string) {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = markdown.match(frontmatterRegex);
  
  if (!match) {
    return { data: {}, content: markdown };
  }
  
  const yamlContent = match[1];
  const bodyContent = match[2];
  const data: Record<string, string> = {};
  
  yamlContent.split('\n').forEach(line => {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.slice(0, colonIndex).trim();
      let value = line.slice(colonIndex + 1).trim();
      // Remove surrounding quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      data[key] = value;
    }
  });
  
  return { data, content: bodyContent };
}

// Markdown 파일 로딩
const markdownFiles = import.meta.glob('./posts/*.md', { eager: true, query: '?raw', import: 'default' });

export const mockPosts: Post[] = Object.entries(markdownFiles).map(([path, rawContent]) => {
  const parsed = parseFrontmatter(rawContent as string);
  
  return {
    id: parsed.data.id || (path.split('/').pop() || '').replace('.md', '') || 'unknown',
    title: parsed.data.title || 'Untitled',
    category: parsed.data.category || 'Dev',
    date: parsed.data.date || new Date().toISOString(),
    bannerImg: parsed.data.bannerImg || 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&q=80&w=800',
    content: parsed.content,
  };
}).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());


export const categories = ['All', ...Array.from(new Set(mockPosts.map(p => p.category)))];

