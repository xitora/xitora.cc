import React, { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Code2,
  ChevronLeft,
  Copy,
  Check,
  Play,
  RotateCcw,
  Sparkles,
  AlertCircle,
  HelpCircle,
  FileCode,
  Layers,
  Search,
  ArrowRight,
  ListFilter,
  X,
  BookOpen
} from "lucide-react";
import FloatingToolHeader from "../components/FloatingToolHeader";
import {
  executeRegexAnalysis,
  generateRegexCodeSnippet,
  REGEX_PRESETS,
  REGEX_CHEATSHEET,
  type RegexExecutionResult,
  type RegexPreset
} from "../utils/regexTester";

interface RegexTesterPageProps {
  onNavigate: (path: string) => void;
  currentPath?: string;
}

type TabMode = "match" | "replace" | "code" | "cheatsheet";

const FLAG_OPTIONS = [
  { flag: "g", label: "global", desc: "전체 일치 검색" },
  { flag: "i", label: "ignoreCase", desc: "대소문자 무시" },
  { flag: "m", label: "multiline", desc: "다중 행 모드 (^, $ 행 단위)" },
  { flag: "s", label: "dotAll", desc: "점(.)이 줄바꿈 문자 포함" },
  { flag: "u", label: "unicode", desc: "유니코드 전체 지원" }
];

export default function RegexTesterPage({ onNavigate }: RegexTesterPageProps) {
  // 1. 핵심 상태 (패턴, 플래그, 테스트 텍스트, 치환 패턴 - 프리셋 선택 전에는 비어있음)
  const [pattern, setPattern] = useState("");
  const [flags, setFlags] = useState("g");
  const [testText, setTestText] = useState("");
  const [replacePattern, setReplacePattern] = useState("");
  const [activeTab, setActiveTab] = useState<TabMode>("match");
  const [snippetLang, setSnippetLang] = useState<"javascript" | "python" | "go" | "java" | "php">("javascript");

  // 초보자 가이드 모달 상태
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  // ESC 키로 가이드 모달 닫기
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isGuideOpen) {
        setIsGuideOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isGuideOpen]);

  // 복사 알림 상태
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // 플래그 토글 핸들러
  const toggleFlag = (flagChar: string) => {
    if (flags.includes(flagChar)) {
      setFlags(flags.replace(flagChar, ""));
    } else {
      setFlags(flags + flagChar);
    }
  };

  // 2. 정규표현식 분석 연산
  const [analysisResult, setAnalysisResult] = useState<RegexExecutionResult>(() => executeRegexAnalysis('', '', ''));
  React.useEffect(() => {
    setAnalysisResult(executeRegexAnalysis('', '', testText));
    if (!pattern) return;
    const worker = new Worker(new URL('../workers/regex.worker.ts', import.meta.url), { type: 'module' });
    let timeout: ReturnType<typeof setTimeout>;
    const finish = (result: RegexExecutionResult) => {
      clearTimeout(timeout);
      worker.terminate();
      setAnalysisResult(result);
    };
    worker.onmessage = event => finish(event.data);
    worker.onerror = () => finish({ isValid: false, error: '정규식을 실행하지 못했습니다.', matches: [], matchCount: 0, executionTimeMs: 0 });
    const debounce = setTimeout(() => {
      timeout = setTimeout(() => finish({ isValid: false, error: '실행 시간이 1.5초를 초과했습니다. 패턴이나 입력 길이를 줄여주세요.', matches: [], matchCount: 0, executionTimeMs: 1500 }), 1500);
      worker.postMessage({ pattern, flags, text: testText, replacement: replacePattern });
    }, 200);
    return () => { clearTimeout(debounce); clearTimeout(timeout); worker.terminate(); };
  }, [pattern, flags, testText, replacePattern]);

  // 3. 프리셋 적용 핸들러
  const handleApplyPreset = (preset: RegexPreset) => {
    setPattern(preset.pattern);
    setFlags(preset.flags);
    setTestText(preset.testText);
  };

  // 클립보드 복사 헬퍼
  const handleCopy = async (key: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1800);
    } catch (err) {
      console.error("복사 실패:", err);
    }
  };

  // 4. 하이라이팅된 텍스트 청크 생성
  const highlightedSpans = useMemo(() => {
    if (!analysisResult.isValid || analysisResult.matches.length === 0 || !pattern) {
      return <span>{testText}</span>;
    }

    const elements: React.ReactNode[] = [];
    let lastIndex = 0;

    analysisResult.matches.forEach((m, idx) => {
      // 매칭 이전의 일반 텍스트
      if (m.index > lastIndex) {
        elements.push(
          <span key={`text-${idx}`}>{testText.substring(lastIndex, m.index)}</span>
        );
      }

      // 매칭된 하이라이트 텍스트
      elements.push(
        <mark
          key={`match-${idx}`}
          style={{
            background: "rgba(56, 189, 248, 0.28)",
            color: "#38bdf8",
            border: "1px solid rgba(56, 189, 248, 0.5)",
            borderRadius: 3,
            padding: "1px 2px",
            fontWeight: 500
          }}
          title={`매치 #${idx + 1} (인덱스: ${m.index})`}
        >
          {m.match}
        </mark>
      );

      lastIndex = m.index + m.length;
    });

    // 마지막 남은 텍스트
    if (lastIndex < testText.length) {
      elements.push(
        <span key="text-end">{testText.substring(lastIndex)}</span>
      );
    }

    return elements;
  }, [analysisResult, testText, pattern]);

  // 5. 플로팅 헤더 미니 위젯 컨텐츠
  const miniWidgetContent = (
    <div style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", justifyContent: "space-between" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flex: 1 }}>
        <div
          style={{
            padding: "3px 8px",
            borderRadius: 6,
            background: analysisResult.isValid ? "rgba(56, 189, 248, 0.15)" : "rgba(239, 68, 68, 0.15)",
            border: `1px solid ${analysisResult.isValid ? "rgba(56, 189, 248, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
            color: analysisResult.isValid ? "#38bdf8" : "#ef4444",
            fontSize: "0.75rem",
            fontWeight: 600,
            flexShrink: 0
          }}
        >
          {analysisResult.isValid ? `${analysisResult.matchCount}건 매치` : "구문 오류"}
        </div>
        <div
          style={{
            fontSize: "0.82rem",
            fontFamily: "var(--font-mono)",
            color: "#e0e0e0",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis"
          }}
        >
          /{pattern}/{flags}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
        <button
          onClick={() => handleCopy("mini-pattern", `/${pattern}/${flags}`)}
          className="btn-glass"
          style={{
            padding: "5px 10px",
            fontSize: "0.75rem",
            display: "flex",
            alignItems: "center",
            gap: 4,
            background: "rgba(255, 255, 255, 0.08)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            borderRadius: 6,
            color: "#f0f0f0"
          }}
        >
          {copiedKey === "mini-pattern" ? <Check size={12} color="#38bdf8" /> : <Copy size={12} />}
          <span>패턴 복사</span>
        </button>
      </div>
    </div>
  );

  return (
    <motion.div
      className="page-layout post-detail-layout"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* 1. 상단 플로팅 헤더 알약 */}
      <FloatingToolHeader
        toolName="정규식 테스터"
        categoryName="도구"
        categoryPath="/tools"
        onNavigate={onNavigate}
        miniWidgetContent={miniWidgetContent}
      />

      <aside className="post-sidebar post-sidebar-left"></aside>

      <div className="post-detail-container" style={{ maxWidth: 1140, width: "100%", paddingBottom: 120 }}>
        {/* 2. 서브 네비게이션 */}
        <button
          className="back-btn"
          onClick={() => onNavigate("/tools")}
          style={{ marginBottom: 20 }}
          aria-label="도구 목록으로 돌아가기"
        >
          <ChevronLeft size={18} />
          <span>목록으로</span>
        </button>

        {/* SVG 그라데이션 정의 (좌상단 #014AFF > 우하단 #0395FC) */}
        <svg width="0" height="0" style={{ position: "absolute", pointerEvents: "none" }}>
          <linearGradient id="toolIconGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#014AFF" />
            <stop offset="100%" stopColor="#0395FC" />
          </linearGradient>
        </svg>

        {/* 3. 헤더 타이틀 */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "linear-gradient(135deg, rgba(1, 74, 255, 0.14) 0%, rgba(3, 149, 252, 0.14) 100%)",
                border: "1px solid rgba(1, 74, 255, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <Code2 size={24} stroke="url(#toolIconGradient)" />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <h1 style={{ fontSize: "1.75rem", fontWeight: 700, margin: 0, letterSpacing: "-0.03em" }}>
                  정규식 테스터
                </h1>
                <button
                  type="button"
                  onClick={() => setIsGuideOpen(true)}
                  title="초보자를 위한 정규식 가이드 열기"
                  aria-label="초보자 가이드 열기"
                  style={{
                    background: "rgba(1, 74, 255, 0.12)",
                    border: "1px solid rgba(1, 74, 255, 0.35)",
                    borderRadius: "50%",
                    width: 32,
                    height: 32,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    color: "#0395FC",
                    transition: "all 0.2s"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(1, 74, 255, 0.25)";
                    e.currentTarget.style.borderColor = "#0395FC";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(1, 74, 255, 0.12)";
                    e.currentTarget.style.borderColor = "rgba(1, 74, 255, 0.35)";
                  }}
                >
                  <HelpCircle size={18} />
                </button>
              </div>
              <p style={{ fontSize: "0.92rem", color: "#888", margin: 0, marginTop: 4 }}>
                실시간 매칭 하이라이트, 캡처 그룹 분석, 텍스트 치환 및 언어별 코드 스니펫 생성
              </p>
            </div>
          </div>
        </div>

        {/* 4. 메인 정규표현식 입력 & 플래그 토글 바 */}
        <div
          style={{
            background: "rgba(255, 255, 255, 0.03)",
            border: analysisResult.isValid ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(239, 68, 68, 0.5)",
            borderRadius: 16,
            padding: "16px 20px",
            marginBottom: 20,
            boxShadow: "0 8px 30px rgba(0, 0, 0, 0.3)"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span style={{ fontSize: "1.3rem", color: "#666", fontFamily: "var(--font-mono)", fontWeight: 700 }}>/</span>
            <input
              type="text"
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              placeholder="정규표현식 패턴을 입력하세요 (예: (\w+)@(\w+\.\w+))"
              style={{
                flex: 1,
                minWidth: 160,
                background: "transparent",
                border: "none",
                outline: "none",
                color: "#fff",
                fontSize: "1.05rem",
                fontFamily: "var(--font-mono)"
              }}
            />
            <span style={{ fontSize: "1.3rem", color: "#666", fontFamily: "var(--font-mono)", fontWeight: 700 }}>/</span>

            {/* 플래그 토글 칩 */}
            <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
              {FLAG_OPTIONS.map((f) => {
                const isSelected = flags.includes(f.flag);
                return (
                  <button
                    key={f.flag}
                    onClick={() => toggleFlag(f.flag)}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      background: isSelected ? "rgba(1, 74, 255, 0.2)" : "rgba(255, 255, 255, 0.05)",
                      border: isSelected ? "1px solid rgba(1, 74, 255, 0.4)" : "1px solid transparent",
                      color: isSelected ? "#0395FC" : "#777",
                      fontFamily: "var(--font-mono)",
                      fontWeight: isSelected ? 700 : 400,
                      cursor: "pointer",
                      fontSize: "0.85rem",
                      transition: "all 0.15s"
                    }}
                    title={`${f.label} (${f.desc})`}
                  >
                    {f.flag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 구문 유효성 및 실행 결과 상태 표시줄 */}
          <div
            style={{
              marginTop: 12,
              paddingTop: 10,
              borderTop: "1px solid rgba(255, 255, 255, 0.06)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: "0.82rem",
              flexWrap: "wrap",
              gap: 8
            }}
          >
            {analysisResult.isValid ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#0395FC", flexWrap: "wrap" }}>
                <span>✓ 유효한 정규표현식</span>
                <span style={{ color: "#666" }}>|</span>
                <span style={{ color: "#aaa" }}>
                  매칭: <strong style={{ color: "#fff" }}>{analysisResult.matchCount}</strong>건
                </span>
                <span style={{ color: "#666" }}>|</span>
                <span style={{ color: "#888" }}>실행 시간: {analysisResult.executionTimeMs}ms</span>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#ef4444" }}>
                <AlertCircle size={15} />
                <span>{analysisResult.error}</span>
              </div>
            )}

            <button
              onClick={() => handleCopy("pattern-text", `/${pattern}/${flags}`)}
              style={{
                background: "none",
                border: "none",
                color: copiedKey === "pattern-text" ? "#0395FC" : "#888",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4,
                fontSize: "0.78rem"
              }}
            >
              {copiedKey === "pattern-text" ? <Check size={13} color="#0395FC" /> : <Copy size={13} />}
              <span>{copiedKey === "pattern-text" ? "복사됨!" : "패턴 복사"}</span>
            </button>
          </div>
        </div>

        {/* 5. 탭 선택 네비게이션 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 20,
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            paddingBottom: 8,
            overflowX: "auto",
            whiteSpace: "nowrap",
            scrollbarWidth: "none"
          }}
        >
          {[
            { id: "match", label: "매칭 분석 & 하이라이트", icon: Search },
            { id: "replace", label: "치환 (Replace)", icon: RotateCcw },
            { id: "code", label: "코드 스니펫 생성", icon: FileCode },
            { id: "cheatsheet", label: "문법 치트시트", icon: HelpCircle }
          ].map((tab) => {
            const IconComp = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabMode)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 14px",
                  borderRadius: 8,
                  background: isActive ? "rgba(1, 74, 255, 0.15)" : "transparent",
                  border: isActive ? "1px solid rgba(1, 74, 255, 0.35)" : "1px solid transparent",
                  color: isActive ? "#0395FC" : "#888",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                  fontWeight: isActive ? 600 : 400,
                  transition: "all 0.2s",
                  flexShrink: 0
                }}
              >
                <IconComp size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* 6. 탭별 메인 컨텐츠 영역 */}
        {activeTab === "match" && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
              gap: 20,
              alignItems: "start"
            }}
          >
            {/* 테스트 텍스트 입력 및 실시간 하이라이트 */}
            <div
              style={{
                background: "rgba(255, 255, 255, 0.02)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: 16,
                padding: 18,
                display: "flex",
                flexDirection: "column",
                gap: 12
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#ccc" }}>
                  테스트 텍스트 입력
                </span>
                <button
                  onClick={() => setTestText("")}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#888",
                    cursor: "pointer",
                    fontSize: "0.78rem"
                  }}
                >
                  지우기
                </button>
              </div>

              <textarea
                value={testText}
                onChange={(e) => setTestText(e.target.value)}
                rows={8}
                placeholder="테스트할 문자열을 여기에 입력하세요..."
                style={{
                  width: "100%",
                  padding: "12px",
                  background: "rgba(0, 0, 0, 0.5)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: 10,
                  color: "#fff",
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.9rem",
                  lineHeight: 1.6,
                  resize: "vertical",
                  boxSizing: "border-box",
                  outline: "none"
                }}
              />

              {/* 실시간 하이라이트 뷰어 */}
              <div>
                <span style={{ display: "block", fontSize: "0.82rem", color: "#888", marginBottom: 6 }}>
                  실시간 매칭 하이라이트 미리보기
                </span>
                <div
                  style={{
                    padding: "12px",
                    background: "rgba(0, 0, 0, 0.6)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: 10,
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.88rem",
                    lineHeight: 1.6,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-all",
                    maxHeight: 200,
                    overflowY: "auto"
                  }}
                >
                  {highlightedSpans}
                </div>
              </div>
            </div>

            {/* 매칭 목록 및 캡처 그룹 분해 카드 */}
            <div
              style={{
                background: "rgba(255, 255, 255, 0.02)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: 16,
                padding: 18,
                display: "flex",
                flexDirection: "column",
                gap: 12
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#ccc" }}>
                  매치 상세 정보 ({analysisResult.matchCount}건)
                </span>
              </div>

              {analysisResult.matches.length === 0 ? (
                <div
                  style={{
                    padding: "36px 20px",
                    textAlign: "center",
                    color: "#666",
                    fontSize: "0.85rem",
                    background: "rgba(0,0,0,0.3)",
                    borderRadius: 10
                  }}
                >
                  일치하는 텍스트가 없습니다.
                </div>
              ) : (
                <div
                  className="custom-scrollbar"
                  data-lenis-prevent
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    maxHeight: 380,
                    overflowY: "auto",
                    paddingRight: 4
                  }}
                >
                  {analysisResult.matches.map((m, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 10,
                        background: "rgba(0, 0, 0, 0.4)",
                        border: "1px solid rgba(255, 255, 255, 0.06)",
                        display: "flex",
                        flexDirection: "column",
                        gap: 6
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span
                            style={{
                              fontSize: "0.72rem",
                              padding: "2px 6px",
                              borderRadius: 4,
                              background: "rgba(56, 189, 248, 0.15)",
                              color: "#38bdf8",
                              fontWeight: 600
                            }}
                          >
                            #{idx + 1}
                          </span>
                          <span
                            style={{
                              fontSize: "0.88rem",
                              fontFamily: "var(--font-mono)",
                              color: "#fff",
                              fontWeight: 500
                            }}
                          >
                            {m.match}
                          </span>
                        </div>
                        <span style={{ fontSize: "0.75rem", color: "#777" }}>
                          인덱스: {m.index} (길이: {m.length})
                        </span>
                      </div>

                      {/* 캡처 그룹 목록 */}
                      {m.groups.length > 0 && (
                        <div
                          style={{
                            marginTop: 4,
                            paddingTop: 6,
                            borderTop: "1px dashed rgba(255, 255, 255, 0.08)",
                            display: "flex",
                            flexDirection: "column",
                            gap: 4
                          }}
                        >
                          {m.groups.map((grp) => (
                            <div
                              key={grp.index}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                fontSize: "0.78rem"
                              }}
                            >
                              <span style={{ color: "#888", fontFamily: "var(--font-mono)" }}>
                                그룹 ${grp.index}:
                              </span>
                              <span
                                style={{
                                  background: "rgba(255, 255, 255, 0.06)",
                                  padding: "1px 6px",
                                  borderRadius: 4,
                                  color: "#34d399",
                                  fontFamily: "var(--font-mono)"
                                }}
                              >
                                {grp.value || "(빈 값)"}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 7. 치환(Replace) 탭 */}
        {activeTab === "replace" && (
          <div
            style={{
              background: "rgba(255, 255, 255, 0.02)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: 16,
              padding: 24,
              display: "flex",
              flexDirection: "column",
              gap: 18
            }}
          >
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", color: "#aaa", marginBottom: 6 }}>
                치환 패턴 (Substitution Pattern)
              </label>
              <input
                type="text"
                value={replacePattern}
                onChange={(e) => setReplacePattern(e.target.value)}
                placeholder="예: $1-****-$3 또는 [REPLACED]"
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  background: "rgba(0, 0, 0, 0.5)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: 10,
                  color: "#fff",
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.95rem",
                  boxSizing: "border-box"
                }}
              />
              <span style={{ display: "block", fontSize: "0.75rem", color: "#777", marginTop: 4 }}>
                팁: $& (전체 일치 텍스트), $1, $2 (각 캡처 그룹 번호), $` (앞부분), $' (뒷부분)
              </span>
            </div>

            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <label style={{ fontSize: "0.85rem", color: "#aaa" }}>치환 결과 미리보기</label>
                <button
                  onClick={() => handleCopy("replace-result", analysisResult.replacedText || "")}
                  style={{
                    background: "none",
                    border: "none",
                    color: copiedKey === "replace-result" ? "#38bdf8" : "#888",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: "0.78rem"
                  }}
                >
                  {copiedKey === "replace-result" ? <Check size={13} /> : <Copy size={13} />}
                  <span>{copiedKey === "replace-result" ? "복사됨!" : "결과 텍스트 복사"}</span>
                </button>
              </div>

              <textarea
                value={analysisResult.replacedText || ""}
                readOnly
                rows={6}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  background: "rgba(0, 0, 0, 0.6)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: 10,
                  color: "#34d399",
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.9rem",
                  lineHeight: 1.6,
                  resize: "vertical",
                  boxSizing: "border-box"
                }}
              />
            </div>
          </div>
        )}

        {/* 8. 코드 스니펫 생성기 탭 */}
        {activeTab === "code" && (
          <div
            style={{
              background: "rgba(255, 255, 255, 0.02)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: 16,
              padding: 24,
              display: "flex",
              flexDirection: "column",
              gap: 16
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
              <div style={{ display: "flex", gap: 6 }}>
                {(["javascript", "python", "go", "java", "php"] as const).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setSnippetLang(lang)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 8,
                      background: snippetLang === lang ? "rgba(1, 74, 255, 0.2)" : "rgba(255, 255, 255, 0.04)",
                      border: snippetLang === lang ? "1px solid rgba(1, 74, 255, 0.4)" : "1px solid transparent",
                      color: snippetLang === lang ? "#0395FC" : "#888",
                      fontSize: "0.82rem",
                      cursor: "pointer",
                      textTransform: "capitalize"
                    }}
                  >
                    {lang === "javascript" ? "JavaScript / TS" : lang}
                  </button>
                ))}
              </div>

              <button
                onClick={() =>
                  handleCopy("code-snippet", generateRegexCodeSnippet(pattern, flags, snippetLang))
                }
                style={{
                  background: "none",
                  border: "none",
                  color: copiedKey === "code-snippet" ? "#0395FC" : "#888",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: "0.8rem"
                }}
              >
                {copiedKey === "code-snippet" ? <Check size={14} /> : <Copy size={14} />}
                <span>{copiedKey === "code-snippet" ? "복사됨!" : "코드 복사"}</span>
              </button>
            </div>

            <pre
              style={{
                margin: 0,
                padding: "16px 20px",
                background: "rgba(0, 0, 0, 0.6)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: 12,
                color: "#e2e8f0",
                fontFamily: "var(--font-mono)",
                fontSize: "0.88rem",
                lineHeight: 1.6,
                overflowX: "auto"
              }}
            >
              <code>{generateRegexCodeSnippet(pattern, flags, snippetLang)}</code>
            </pre>
          </div>
        )}

        {/* 9. 문법 치트시트 탭 */}
        {activeTab === "cheatsheet" && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 16
            }}
          >
            {REGEX_CHEATSHEET.map((cat) => (
              <div
                key={cat.category}
                style={{
                  background: "rgba(255, 255, 255, 0.02)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: 14,
                  padding: 16,
                  display: "flex",
                  flexDirection: "column",
                  gap: 10
                }}
              >
                <span style={{ fontSize: "0.88rem", fontWeight: 600, color: "#0395FC" }}>
                  {cat.category}
                </span>

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {cat.items.map((item) => (
                    <div
                      key={item.token}
                      style={{
                        padding: "6px 8px",
                        borderRadius: 6,
                        background: "rgba(0, 0, 0, 0.3)",
                        border: "1px solid rgba(255, 255, 255, 0.04)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        fontSize: "0.8rem"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <code
                          style={{
                            color: "#f43f5e",
                            fontWeight: 700,
                            background: "rgba(244, 63, 94, 0.1)",
                            padding: "1px 5px",
                            borderRadius: 4
                          }}
                        >
                          {item.token}
                        </code>
                        <span style={{ color: "#ccc" }}>{item.name}</span>
                      </div>
                      <span style={{ color: "#777", fontSize: "0.75rem" }}>{item.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 10. 하단 프리셋 라이브러리 목록 카드 */}
        <div
          style={{
            marginTop: 32,
            background: "rgba(255, 255, 255, 0.02)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: 16,
            padding: 20
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <Sparkles size={16} color="#0395FC" />
            <span style={{ fontSize: "0.92rem", fontWeight: 600 }}>자주 쓰이는 정규식 프리셋</span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 10
            }}
          >
            {REGEX_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => handleApplyPreset(preset)}
                style={{
                  textAlign: "left",
                  padding: "10px 14px",
                  borderRadius: 10,
                  background: pattern === preset.pattern ? "rgba(1, 74, 255, 0.14)" : "rgba(255, 255, 255, 0.03)",
                  border: pattern === preset.pattern ? "1px solid rgba(1, 74, 255, 0.35)" : "1px solid rgba(255, 255, 255, 0.06)",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  transition: "all 0.2s"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#fff" }}>
                    {preset.name}
                  </span>
                  <span
                    style={{
                      fontSize: "0.72rem",
                      padding: "1px 5px",
                      borderRadius: 4,
                      background: "rgba(255, 255, 255, 0.08)",
                      color: "#aaa"
                    }}
                  >
                    {preset.category}
                  </span>
                </div>
                <span style={{ fontSize: "0.75rem", color: "#888" }}>{preset.description}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <aside className="post-sidebar post-sidebar-right"></aside>

      {/* 5. 초보자 정규식 입문 가이드 모달 */}
      <AnimatePresence>
        {isGuideOpen && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 9999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "16px",
              background: "rgba(0, 0, 0, 0.75)",
              backdropFilter: "blur(6px)"
            }}
            onClick={() => setIsGuideOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "100%",
                maxWidth: 720,
                maxHeight: "88vh",
                background: "#0d111a",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                borderRadius: 20,
                boxShadow: "0 20px 50px rgba(0, 0, 0, 0.6)",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden"
              }}
            >
              {/* 모달 헤더 */}
              <div
                style={{
                  padding: "18px 22px",
                  borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "rgba(255, 255, 255, 0.02)"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 10,
                      background: "rgba(1, 74, 255, 0.15)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#0395FC"
                    }}
                  >
                    <BookOpen size={18} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#fff" }}>
                      정규표현식(Regex) 초보자 가이드
                    </h3>
                    <p style={{ margin: 0, fontSize: "0.8rem", color: "#888" }}>
                      기본 개념부터 실전에서 가장 많이 쓰이는 패턴까지 한눈에 알아보기
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsGuideOpen(false)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#888",
                    cursor: "pointer",
                    padding: 6,
                    borderRadius: 8,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#888")}
                >
                  <X size={20} />
                </button>
              </div>

              {/* 모달 본문 (스크롤) */}
              <div
                style={{
                  padding: "20px 22px",
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column",
                  gap: 20
                }}
              >
                {/* 섹션 1: 정규식이란? */}
                <div
                  style={{
                    padding: 14,
                    background: "rgba(1, 74, 255, 0.08)",
                    border: "1px solid rgba(1, 74, 255, 0.2)",
                    borderRadius: 12
                  }}
                >
                  <h4 style={{ margin: "0 0 6px 0", fontSize: "0.92rem", fontWeight: 600, color: "#0395FC" }}>
                    정규표현식이란 무엇인가요?
                  </h4>
                  <p style={{ margin: 0, fontSize: "0.85rem", color: "#ccc", lineHeight: 1.55 }}>
                    텍스트 안에서 특정한 형식이나 규칙을 가진 글자들을 찾아내고(검색), 잘못된 형식을 걸러내거나(유효성 검사), 원하는 형태로 바꾸는(치환) 강력한 문자열 검색 도구입니다.
                  </p>
                </div>

                {/* 섹션 2: 자주 쓰는 핵심 기호 퀵 레퍼런스 */}
                <div>
                  <h4 style={{ margin: "0 0 10px 0", fontSize: "0.92rem", fontWeight: 600, color: "#fff" }}>
                    가장 자주 쓰이는 핵심 기호
                  </h4>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                      gap: 8
                    }}
                  >
                    {[
                      { sym: "\\d", desc: "모든 숫자 (0~9)", eg: "010, 1234" },
                      { sym: "\\w", desc: "영문자, 숫자, 밑줄(_)", eg: "user_01, apple" },
                      { sym: "\\s", desc: "공백 문자 (스페이스, 탭, 줄바꿈)", eg: "공백 분리" },
                      { sym: ".", desc: "아무 문자 1개 (줄바꿈 제외)", eg: "a.c → abc, a1c" },
                      { sym: "+", desc: "앞의 글자가 1개 이상 반복", eg: "\\d+ → 1, 999" },
                      { sym: "*", desc: "앞의 글자가 0개 이상 반복", eg: "ab* → a, ab, abb" },
                      { sym: "?", desc: "앞의 글자가 있거나 없음 (0 또는 1)", eg: "https? → http, https" },
                      { sym: "{n,m}", desc: "최소 n회 이상, 최대 m회 이하", eg: "\\d{4} → 연도 4자리" },
                      { sym: "^ / $", desc: "문장의 시작(^)과 문장의 끝($)", eg: "^hello / end$" },
                      { sym: "[가-힣]", desc: "한글 완성형 단어 전체", eg: "홍길동, 대한민국" },
                      { sym: "[a-zA-Z]", desc: "영문 알파벳 대소문자 전체", eg: "Hello, WORLD" },
                      { sym: "()", desc: "그룹 지정 및 캡처 ($1, $2)", eg: "(\\w+)@(\\w+)" }
                    ].map((item) => (
                      <div
                        key={item.sym}
                        style={{
                          padding: "8px 10px",
                          background: "rgba(255, 255, 255, 0.03)",
                          border: "1px solid rgba(255, 255, 255, 0.06)",
                          borderRadius: 8,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 6
                        }}
                      >
                        <code
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontWeight: 700,
                            color: "#0395FC",
                            background: "rgba(1, 74, 255, 0.15)",
                            padding: "2px 6px",
                            borderRadius: 4,
                            fontSize: "0.82rem"
                          }}
                        >
                          {item.sym}
                        </code>
                        <div style={{ textAlign: "right", flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: "0.78rem", color: "#ddd" }}>{item.desc}</div>
                          <div style={{ fontSize: "0.7rem", color: "#777" }}>예: {item.eg}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 섹션 3: 실전 대표 예제 (원클릭 적용 가능) */}
                <div>
                  <h4 style={{ margin: "0 0 10px 0", fontSize: "0.92rem", fontWeight: 600, color: "#fff" }}>
                    클릭하여 바로 써보는 실전 패턴
                  </h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {[
                      {
                        title: "이메일 주소 추출",
                        pat: "[\\w.-]+@[\\w.-]+\\.[a-zA-Z]{2,}",
                        flg: "g",
                        text: "문의는 support@xitora.cc 및 dev-team@example.com 으로 부탁드립니다.",
                        desc: "골뱅이(@) 앞뒤 도메인과 TLD 구조를 매칭합니다."
                      },
                      {
                        title: "휴대폰 번호 검출",
                        pat: "010-\\d{4}-\\d{4}",
                        flg: "g",
                        text: "고객센터: 010-1234-5678, 담당자 직통: 010-9876-5432",
                        desc: "010으로 시작하는 한국 표준 휴대전화 형식을 찾습니다."
                      },
                      {
                        title: "한글 단어만 추출",
                        pat: "[가-힣]+",
                        flg: "g",
                        text: "Welcome to 한국! 아름다운 서울과 부산을 여행하세요 2026.",
                        desc: "공백과 특수문자를 제외한 순수 한글 완성형 단어들을 수집합니다."
                      },
                      {
                        title: "웹사이트 URL 링크",
                        pat: "https?:\\/\\/[^\\s]+",
                        flg: "g",
                        text: "공식 사이트: https://xitora.cc/contact 블로그: http://blog.example.org/post",
                        desc: "http 또는 https 프로토콜을 가진 웹 주소를 추출합니다."
                      },
                      {
                        title: "날짜 형식 (YYYY-MM-DD)",
                        pat: "\\d{4}-\\d{2}-\\d{2}",
                        flg: "g",
                        text: "프로젝트 시작일: 2026-03-01, 종료 예정일: 2026-12-31",
                        desc: "4자리 연도와 2자리 월, 일을 하이픈으로 구분한 날짜를 찾습니다."
                      }
                    ].map((example) => (
                      <div
                        key={example.title}
                        style={{
                          padding: "10px 14px",
                          background: "rgba(255, 255, 255, 0.03)",
                          border: "1px solid rgba(255, 255, 255, 0.07)",
                          borderRadius: 10,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 12
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                            <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#fff" }}>
                              {example.title}
                            </span>
                            <code
                              style={{
                                fontSize: "0.76rem",
                                color: "#0395FC",
                                background: "rgba(1, 74, 255, 0.12)",
                                padding: "1px 5px",
                                borderRadius: 4,
                                fontFamily: "var(--font-mono)"
                              }}
                            >
                              /{example.pat}/
                            </code>
                          </div>
                          <div style={{ fontSize: "0.76rem", color: "#888" }}>{example.desc}</div>
                        </div>

                        <button
                          onClick={() => {
                            setPattern(example.pat);
                            setFlags(example.flg);
                            setTestText(example.text);
                            setIsGuideOpen(false);
                          }}
                          style={{
                            padding: "6px 12px",
                            background: "rgba(1, 74, 255, 0.2)",
                            border: "1px solid rgba(1, 74, 255, 0.4)",
                            borderRadius: 8,
                            color: "#0395FC",
                            fontSize: "0.78rem",
                            fontWeight: 600,
                            cursor: "pointer",
                            whiteSpace: "nowrap",
                            transition: "all 0.2s"
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "rgba(1, 74, 255, 0.32)";
                            e.currentTarget.style.color = "#fff";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "rgba(1, 74, 255, 0.2)";
                            e.currentTarget.style.color = "#0395FC";
                          }}
                        >
                          테스터에 적용
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 모달 푸터 */}
              <div
                style={{
                  padding: "14px 22px",
                  borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                  display: "flex",
                  justifyContent: "flex-end",
                  background: "rgba(255, 255, 255, 0.02)"
                }}
              >
                <button
                  onClick={() => setIsGuideOpen(false)}
                  style={{
                    padding: "8px 18px",
                    background: "rgba(1, 74, 255, 0.22)",
                    border: "1px solid rgba(1, 74, 255, 0.45)",
                    borderRadius: 8,
                    color: "#0395FC",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                >
                  닫기
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
