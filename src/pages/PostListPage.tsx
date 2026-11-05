import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, ChevronLeft, Hash } from 'lucide-react';
import { mockPosts, categories } from '../data/posts';

interface PostListPageProps {
  onNavigate: (path: string) => void;
  currentPath?: string;
}

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } }
};

const staggerContainer = {
  initial: {},
  animate: { transition: { staggerChildren: 0.08 } }
};

export default function PostListPage({ onNavigate, currentPath }: PostListPageProps) {
  const searchString = currentPath ? (currentPath.split('?')[1] || '') : window.location.search;
  const activeCategory = new URLSearchParams(searchString).get('category') || 'All';
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPosts = useMemo(() => {
    return mockPosts
      .filter(post => activeCategory === 'All' || post.category === activeCategory)
      .filter(post => post.title.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [activeCategory, searchQuery]);

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
              <li key={c.name} className={c.name === activeCategory ? 'active' : ''}>
                <button onClick={() => {
                  onNavigate(`/posts${c.name === 'All' ? '' : `?category=${encodeURIComponent(c.name)}`}`);
                }}>
                  {c.name} <span className="cat-count">({c.count})</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <div className="post-detail-container">
        <button className="back-btn" onClick={() => onNavigate('/')} style={{ marginBottom: 24 }}>
          <ChevronLeft size={20} /> 메인으로
          </button>

        <motion.div className="list-header" style={{ marginBottom: 40, textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}>
          <h1 style={{ fontSize: '2.5rem', margin: '0', letterSpacing: '-0.04em', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Hash size={36} />
            포스트
          </h1>
          <div className="search-box" style={{ marginBottom: '8px' }}>
            <Search size={16} className="search-icon" />
            <input 
              type="text" 
              placeholder="게시물 검색..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </motion.div>

        {/* Mobile Category Selector */}
        <div className="mobile-category-selector">
          <ul className="mobile-category-list">
            {categoryCounts.map((c: any) => (
              <li key={c.name}>
                <button 
                  className={`mobile-cat-btn ${c.name === activeCategory ? 'active' : ''}`}
                  onClick={() => onNavigate(`/posts${c.name === 'All' ? '' : `?category=${encodeURIComponent(c.name)}`}`)}
                >
                  {c.name}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="post-list-table">
          <div className="post-list-table-header">
            <div className="col-cat">분류</div>
            <div className="col-title">제목</div>
            <div className="col-date">작성일</div>
          </div>
          <motion.div className="post-list-table-body" variants={staggerContainer}>
            {filteredPosts.length > 0 ? (
              filteredPosts.map(post => {
                const dateObj = new Date(post.date);
                const formattedDate = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
                
                return (
                  <motion.div 
                    key={post.id} 
                    className="post-list-row" 
                    variants={fadeUp}
                    onClick={() => onNavigate(`/post/${post.id}`)}
                  >
                    <div className="col-cat">{post.category}</div>
                    <div className="col-title">{post.title}</div>
                    <div className="col-date">{formattedDate}</div>
                  </motion.div>
                );
              })
            ) : (
              <div className="no-posts">조건에 맞는 게시물이 없습니다.</div>
            )}
          </motion.div>
        </div>
      </div>
      
      {/* Empty right sidebar to maintain center alignment */}
      <aside className="post-sidebar post-sidebar-right"></aside>
    </motion.div>
  );
}
