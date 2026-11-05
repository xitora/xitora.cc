import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  Terminal,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  Code2,
  Globe,
  Send,
  Layers,
} from 'lucide-react';
import FloatingToolHeader from '../components/FloatingToolHeader';
import FloatingToast from '../components/FloatingToast';
import {
  parseCurlCommand,
  generateFetchCode,
  generateAxiosCode,
  generatePythonRequestsCode,
  generateGoCode,
  CURL_SAMPLE_PRESETS,
  TargetLanguage,
  ParsedCurl,
} from '../utils/curl';

interface CurlConverterPageProps {
  onNavigate: (path: string) => void;
}

export default function CurlConverterPage({ onNavigate }: CurlConverterPageProps) {
  // cURL 입력값 (기본값 빈 문자열, 프리셋 선택 시 로드)
  const [curlInput, setCurlInput] = useState<string>('');
  // 대상 변환 언어 (기본값: fetch)
  const [selectedLanguage, setSelectedLanguage] = useState<TargetLanguage>('fetch');
  // 복사 알림 토스트
  const [copyToast, setCopyToast] = useState<string | null>(null);

  // cURL 파싱
  const parsedCurl: ParsedCurl | null = useMemo(() => {
    return parseCurlCommand(curlInput);
  }, [curlInput]);

  // 대상 언어별 변환 코드 생성
  const generatedCode = useMemo(() => {
    if (!parsedCurl) return '';
    try {
      switch (selectedLanguage) {
        case 'fetch':
          return generateFetchCode(parsedCurl);
        case 'axios':
          return generateAxiosCode(parsedCurl);
        case 'python':
          return generatePythonRequestsCode(parsedCurl);
        case 'go':
          return generateGoCode(parsedCurl);
        default:
          return '';
      }
    } catch (err) {
      console.error('코드 변환 오류:', err);
      return '// 코드 변환 중 오류가 발생했습니다.';
    }
  }, [parsedCurl, selectedLanguage]);

  // 복사 핸들러
  const handleCopyText = useCallback(async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyToast(`${label}이(가) 복사되었습니다.`);
      setTimeout(() => setCopyToast(null), 2000);
    } catch (err) {
      console.error('클립보드 복사 실패:', err);
    }
  }, []);

  // 비우기 핸들러
  const handleClear = useCallback(() => {
    setCurlInput('');
  }, []);

  // 프리셋 로드 핸들러
  const handleLoadPreset = useCallback((curl: string) => {
    setCurlInput(curl);
  }, []);

  // 미니 위젯 컨텐츠
  const miniWidgetContent = useMemo(() => {
    if (!parsedCurl) {
      return <span style={{ color: 'var(--text-muted)' }}>cURL 명령어 대기 중</span>;
    }
    const methodColors: Record<string, string> = {
      GET: '#38bdf8',
      POST: '#34d399',
      PUT: '#fbbf24',
      DELETE: '#f87171',
      PATCH: '#0395FC',
    };
    const color = methodColors[parsedCurl.method] || '#0395FC';

    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
        <span
          style={{
            color,
            fontWeight: 700,
            background: 'rgba(255,255,255,0.06)',
            padding: '1px 6px',
            borderRadius: 4,
          }}
        >
          {parsedCurl.method}
        </span>
        <span style={{ color: 'var(--border)' }}>|</span>
        <span style={{ color: '#0395FC', fontWeight: 600 }}>{selectedLanguage.toUpperCase()}</span>
      </div>
    );
  }, [parsedCurl, selectedLanguage]);

  return (
    <motion.div
      className="page-layout post-detail-layout"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* 1. 상단 플로팅 알약 (FloatingToolHeader) */}
      <FloatingToolHeader
        toolName="cURL ↔ 언어별 코드 변환기"
        categoryName="도구"
        categoryPath="/tools"
        onNavigate={onNavigate}
        miniWidgetContent={miniWidgetContent}
      />

      {/* 2. 복사 알림 토스트 (createPortal 기반 완벽한 CLS 0 방어) */}
      <FloatingToast message={copyToast} />

      <aside className="post-sidebar post-sidebar-left"></aside>

      <div className="post-detail-container" style={{ maxWidth: 1100, width: '100%', paddingBottom: 120 }}>
        {/* 뒤로가기 버튼 */}
        <button
          className="back-btn"
          onClick={() => onNavigate('/tools')}
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

        {/* 헤더 타이틀 */}
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
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Terminal size={24} stroke="url(#toolIconGradient)" />
            </div>
            <div>
              <h1 style={{ fontSize: "1.75rem", fontWeight: 700, margin: 0, letterSpacing: "-0.03em" }}>
                cURL ↔ 언어별 코드 변환기
              </h1>
              <p style={{ fontSize: "0.92rem", color: "#888", margin: 0, marginTop: 4 }}>
                cURL 명령어를 Fetch, Axios, Python Requests, Go HTTP 코드로 즉시 변환
              </p>
            </div>
          </div>
        </div>

        {/* 샘플 프리셋 선택 칩 & 비우기 버튼 (우측 정렬) */}
        <div className="jwt-presets-bar" style={{ marginBottom: 24 }}>
          <span className="jwt-presets-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Sparkles size={14} style={{ color: '#0395FC' }} />
            샘플 프리셋:
          </span>
          <div className="jwt-presets-list">
            {CURL_SAMPLE_PRESETS.map((preset) => (
              <button
                key={preset.title}
                type="button"
                onClick={() => handleLoadPreset(preset.curl)}
                className="jwt-preset-chip"
                title={preset.description}
              >
                <span>{preset.title}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="jwt-preset-chip jwt-chip-clear"
            style={{ marginLeft: 'auto' }}
            title="cURL 명령어 비우기"
          >
            <RotateCcw size={13} />
            <span>비우기</span>
          </button>
        </div>

        {/* 메인 2열 그리드 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20, alignItems: 'start' }}>
          {/* 좌측: cURL 입력 에디터 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 16,
                padding: 20,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Terminal size={16} color="#0395FC" />
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-main)' }}>cURL 명령어 입력</span>
                </div>
                {curlInput.trim() && (
                  <button
                    type="button"
                    onClick={() => handleCopyText(curlInput, 'cURL 명령어')}
                    className="jwt-ghost-btn"
                    style={{
                      fontSize: 12,
                      padding: '4px 10px',
                    }}
                  >
                    <Copy size={12} />
                    <span>복사</span>
                  </button>
                )}
              </div>

              <textarea
                value={curlInput}
                onChange={(e) => setCurlInput(e.target.value)}
                placeholder="여기에 curl 명령어를 붙여넣으세요... (예: curl -X POST https://api.example.com -d '{...}')"
                spellCheck={false}
                rows={10}
                style={{
                  width: '100%',
                  padding: 14,
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                  fontSize: 13,
                  lineHeight: 1.6,
                  borderRadius: 10,
                  background: 'rgba(0,0,0,0.4)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-main)',
                  outline: 'none',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* 파싱된 요청 정보 분석 카드 */}
            {parsedCurl && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 16,
                  padding: 20,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Globe size={16} color="#0395FC" />
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-main)' }}>분석된 HTTP 요청 정보</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span
                    style={{
                      padding: '4px 8px',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 700,
                      background: 'rgba(1, 74, 255, 0.2)',
                      border: '1px solid rgba(1, 74, 255, 0.4)',
                      color: '#0395FC',
                    }}
                  >
                    {parsedCurl.method}
                  </span>
                  <span
                    style={{
                      fontFamily: 'monospace',
                      fontSize: 13,
                      color: 'var(--text-main)',
                      wordBreak: 'break-all',
                    }}
                  >
                    {parsedCurl.url}
                  </span>
                </div>

                {Object.keys(parsedCurl.headers).length > 0 && (
                  <div>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                      요청 헤더 ({Object.keys(parsedCurl.headers).length}개):
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {Object.entries(parsedCurl.headers).map(([k, v]) => (
                        <span
                          key={k}
                          style={{
                            fontSize: 11,
                            fontFamily: 'monospace',
                            padding: '3px 7px',
                            borderRadius: 6,
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid var(--border)',
                            color: 'var(--text-muted)',
                          }}
                        >
                          <strong style={{ color: 'var(--text-main)' }}>{k}:</strong> {v}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </div>

          {/* 우측: 변환된 소스코드 및 언어 탭 */}
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 16,
              padding: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            {/* 언어 선택 탭 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
              <div
                style={{
                  display: 'inline-flex',
                  background: 'rgba(255, 255, 255, 0.03)',
                  padding: 4,
                  borderRadius: 10,
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  gap: 4,
                }}
              >
                {(
                  [
                    { id: 'fetch', label: 'Fetch' },
                    { id: 'axios', label: 'Axios' },
                    { id: 'python', label: 'Python' },
                    { id: 'go', label: 'Go' },
                  ] as { id: TargetLanguage; label: string }[]
                ).map((tab) => {
                  const isActive = selectedLanguage === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setSelectedLanguage(tab.id)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 7,
                        fontSize: 12,
                        fontWeight: isActive ? 600 : 400,
                        border: isActive ? '1px solid rgba(1, 74, 255, 0.4)' : '1px solid transparent',
                        cursor: 'pointer',
                        background: isActive ? 'rgba(1, 74, 255, 0.2)' : 'transparent',
                        color: isActive ? '#0395FC' : 'var(--text-muted)',
                        transition: 'all 0.15s',
                      }}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {generatedCode && (
                <button
                  type="button"
                  onClick={() => handleCopyText(generatedCode, `${selectedLanguage.toUpperCase()} 코드`)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    fontSize: 12,
                    padding: '6px 12px',
                    borderRadius: 8,
                    background: 'rgba(1, 74, 255, 0.2)',
                    border: '1px solid rgba(1, 74, 255, 0.4)',
                    color: '#0395FC',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  <Copy size={13} />
                  <span>코드 복사</span>
                </button>
              )}
            </div>

            {/* 코드 블록 영역 */}
            <div
              style={{
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: 16,
                minHeight: 280,
                overflowX: 'auto',
              }}
            >
              {generatedCode ? (
                <pre
                  style={{
                    margin: 0,
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                    fontSize: 13,
                    lineHeight: 1.6,
                    color: 'var(--text-main)',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                  }}
                >
                  <code>{generatedCode}</code>
                </pre>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: 260,
                    color: 'var(--text-muted)',
                    gap: 8,
                    fontSize: 13,
                  }}
                >
                  <Code2 size={24} style={{ opacity: 0.4 }} />
                  <span>cURL 명령어를 입력하거나 샘플 프리셋을 선택하세요.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <aside className="post-sidebar post-sidebar-right"></aside>
    </motion.div>
  );
}
