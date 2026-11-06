import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Wrench, ChevronLeft, ArrowUpRight, Search } from "lucide-react";

type Navigate = (path: string) => void;

interface ToolsListPageProps {
  onNavigate: Navigate;
  currentPath?: string;
}

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
  animate: { opacity: 1, transition: { duration: 0.5, ease: "easeOut" as const } }
};

// 문자 그룹 우선순위: 숫자(1-0) -> 영문(A-Z) -> 한글(ㄱ-ㅎ) -> 기타
function getCharGroup(ch: string): number {
  if (/[0-9]/.test(ch)) return 1;
  if (/[a-zA-Z]/.test(ch)) return 2;
  if (/[가-힣ㄱ-ㅎㅏ-ㅣ]/.test(ch)) return 3;
  return 4;
}

// 1-0, A-Z, ㄱ-ㅎ 순서로 이름 비교하는 정렬 함수
export function compareToolTitles(a: string, b: string): number {
  try {
    const minLen = Math.min(a.length, b.length);
    for (let i = 0; i < minLen; i++) {
      const ca = a[i];
      const cb = b[i];
      if (ca === cb) continue;
      const ga = getCharGroup(ca);
      const gb = getCharGroup(cb);
      if (ga !== gb) return ga - gb;
      const res = ca.localeCompare(cb, "ko", { sensitivity: "base", numeric: true });
      if (res !== 0) return res;
    }
    return a.localeCompare(b, "ko", { numeric: true });
  } catch (err) {
    console.error("도구 이름 정렬 비교 오류:", err);
    return a.localeCompare(b);
  }
}

export { toolsList, toolCategories, type ToolItem } from "../data/tools";
import { toolsList, toolCategories, type ToolItem } from "../data/tools";

export default function ToolsListPage({ onNavigate, currentPath }: ToolsListPageProps) {
  const searchString = currentPath ? currentPath.split("?")[1] || "" : window.location.search;
  const activeCategory = new URLSearchParams(searchString).get("category") || "All";
  const [searchQuery, setSearchQuery] = useState("");

  const filteredTools = useMemo(() => {
    return toolsList
      .filter((tool) => activeCategory === "All" || tool.category === activeCategory)
      .filter(
        (tool) =>
          tool.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          tool.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          tool.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => compareToolTitles(a.title, b.title));
  }, [activeCategory, searchQuery]);

  const categoryCounts = useMemo(() => {
    return toolCategories.map((cat: string) => ({
      name: cat,
      count: cat === "All" ? toolsList.length : toolsList.filter((t) => t.category === cat).length
    }));
  }, []);

  return (
    <motion.div className="page-layout post-detail-layout" variants={pageVariants} initial="initial" animate="animate" exit="exit">
      {/* Desktop Sticky Sidebar */}
      <aside className="post-sidebar post-sidebar-left">
        <div className="sidebar-sticky">
          <h3 className="sidebar-title">카테고리</h3>
          <ul className="category-list">
            {categoryCounts.map((c: any) => (
              <li key={c.name} className={c.name === activeCategory ? "active" : ""}>
                <button
                  onClick={() => {
                    onNavigate(`/tools${c.name === "All" ? "" : `?category=${encodeURIComponent(c.name)}`}`);
                  }}
                >
                  {c.name} <span className="cat-count">({c.count})</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <div className="post-detail-container">
        <button className="back-btn" onClick={() => onNavigate("/")} style={{ marginBottom: 24 }}>
          <ChevronLeft size={20} /> 메인으로
        </button>

        <motion.div
          className="list-header"
          style={{
            marginBottom: 40,
            textAlign: "left",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            flexWrap: "wrap",
            gap: "16px"
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          <h1
            style={{
              fontSize: "2.5rem",
              margin: "0",
              letterSpacing: "-0.04em",
              display: "flex",
              alignItems: "center",
              gap: "12px"
            }}
          >
            <Wrench size={36} />
            도구
          </h1>
          <div className="search-box" style={{ marginBottom: "8px" }}>
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="도구 검색..."
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
                  className={`mobile-cat-btn ${c.name === activeCategory ? "active" : ""}`}
                  onClick={() => onNavigate(`/tools${c.name === "All" ? "" : `?category=${encodeURIComponent(c.name)}`}`)}
                >
                  {c.name}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <motion.div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "16px",
            marginTop: "16px"
          }}
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {filteredTools.length > 0 ? (
            filteredTools.map((item) => (
              <motion.div
                key={item.id}
                className="item-card item-card--interactive"
                variants={fadeUp}
                onClick={() => onNavigate("/tools/" + item.id)}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "0.85rem", color: "var(--accent)", fontWeight: 600 }}>{item.category}</span>
                      {Boolean(item.status) && (
                        <span
                          style={{
                            fontSize: "0.72rem",
                            fontWeight: 600,
                            padding: "2px 8px",
                            borderRadius: "6px",
                            background: "rgba(245, 158, 11, 0.15)",
                            color: "#f59e0b",
                            border: "1px solid rgba(245, 158, 11, 0.3)"
                          }}
                        >
                          {item.status}
                        </span>
                      )}
                    </div>
                    <h3 style={{ fontSize: "1.2rem", fontWeight: 600, color: "var(--text-main)", margin: 0 }}>
                      {item.title}
                    </h3>
                  </div>
                  <div className="item-card-arrow">
                    <ArrowUpRight size={20} />
                  </div>
                </div>
                {item.description && (
                  <p
                    style={{
                      fontSize: "0.95rem",
                      color: "var(--text-muted)",
                      margin: 0,
                      marginTop: "8px"
                    }}
                  >
                    {item.description}
                  </p>
                )}
              </motion.div>
            ))
          ) : (
            <div
              style={{
                gridColumn: "1 / -1",
                padding: "60px 20px",
                textAlign: "center",
                color: "var(--text-muted)",
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "16px"
              }}
            >
              조건에 맞는 도구가 없습니다.
            </div>
          )}
        </motion.div>
      </div>

      {/* Empty right sidebar to maintain center alignment */}
      <aside className="post-sidebar post-sidebar-right"></aside>
    </motion.div>
  );
}
