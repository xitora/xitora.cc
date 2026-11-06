import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  Link2,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  ExternalLink,
  Plus,
  Trash2,
  CheckSquare,
  Square,
  Globe,
  Hash,
  FolderTree,
  SlidersHorizontal,
} from 'lucide-react';
import FloatingToolHeader from '../components/FloatingToolHeader';
import FloatingToast from '../components/FloatingToast';
import {
  QueryParamItem,
  parseUrlString,
  buildUrlString,
  URL_SAMPLE_PRESETS,
} from '../utils/urlParser';

interface UrlParserPageProps {
  onNavigate: (path: string) => void;
}

export default function UrlParserPage({ onNavigate }: UrlParserPageProps) {
  // 사용자가 입력한 원본 URL 문자열 (프리셋 선택 전에는 비어있음)
  const [urlInput, setUrlInput] = useState<string>('');

  // 개별 구성 요소 수정 상태 (오버라이드용)
  const [protocol, setProtocol] = useState<string>('https');
  const [hostname, setHostname] = useState<string>('');
  const [port, setPort] = useState<string>('');
  const [pathname, setPathname] = useState<string>('');
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [hash, setHash] = useState<string>('');
  const [params, setParams] = useState<QueryParamItem[]>([]);

  // 복사 알림 토스트 상태
  const [copyToast, setCopyToast] = useState<string | null>(null);

  // 파라미터나 기본 구성요소 변경 시 실시간 재조합되는 완성형 URL
  const reconstructedUrl = useMemo(() => {
    return buildUrlString({ protocol, hostname, port, pathname, hash, ...credentials }, params);
  }, [protocol, hostname, port, pathname, hash, params, credentials]);

  // 상단 URL 입력창 변경 시 분해 상태 동기화
  const handleUrlInputChange = (newUrl: string) => {
    setUrlInput(newUrl);
    const parsed = parseUrlString(newUrl);
    if (parsed.isValid) {
      setCredentials({ username: parsed.username, password: parsed.password });
      setProtocol(parsed.protocol || 'https');
      setHostname(parsed.hostname);
      setPort(parsed.port);
      setPathname(parsed.pathname);
      setHash(parsed.hash);
      setParams(parsed.params);
    }
  };

  // 프리셋 선택
  const handleApplyPreset = (presetUrl: string) => {
    handleUrlInputChange(presetUrl);
  };

  // 초기화 (빈 상태)
  const handleReset = () => {
    setCredentials({ username: '', password: '' });
    setUrlInput('');
    setProtocol('https');
    setHostname('');
    setPort('');
    setPathname('/');
    setHash('');
    setParams([]);
  };

  // 파라미터 토글
  const handleToggleParam = (id: string) => {
    setParams((prev) =>
      prev.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p))
    );
  };

  // 파라미터 키 변경
  const handleParamKeyChange = (id: string, newKey: string) => {
    setParams((prev) =>
      prev.map((p) => (p.id === id ? { ...p, key: newKey } : p))
    );
  };

  // 파라미터 값 변경
  const handleParamValueChange = (id: string, newVal: string) => {
    setParams((prev) =>
      prev.map((p) => (p.id === id ? { ...p, value: newVal } : p))
    );
  };

  // 파라미터 삭제
  const handleRemoveParam = (id: string) => {
    setParams((prev) => prev.filter((p) => p.id !== id));
  };

  // 파라미터 추가
  const handleAddParam = () => {
    setParams((prev) => [
      ...prev,
      {
        id: `param_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        key: '',
        value: '',
        enabled: true,
      },
    ]);
  };

  // 파라미터 값 URI 인코딩/디코딩 토글
  const handleToggleEncodeValue = (id: string) => {
    setParams((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        try {
          const decoded = decodeURIComponent(p.value);
          if (decoded !== p.value) {
            return { ...p, value: decoded };
          } else {
            return { ...p, value: encodeURIComponent(p.value) };
          }
        } catch {
          return p;
        }
      })
    );
  };

  // 클립보드 복사
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(reconstructedUrl);
      setCopyToast('재조합된 URL이 클립보드에 복사되었습니다.');
      setTimeout(() => setCopyToast(null), 2000);
    } catch {
      setCopyToast('복사 권한이 없어 실패했습니다.');
      setTimeout(() => setCopyToast(null), 2000);
    }
  }, [reconstructedUrl]);

  // 플로팅 헤더 미니 위젯 내용
  const miniWidgetContent = useMemo(() => {
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
        <span
          style={{
            color: '#0395FC',
            fontWeight: 700,
            maxWidth: 140,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {hostname || 'URL 파서'}
        </span>
        <span style={{ color: 'var(--border)' }}>|</span>
        <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{params.length}개 파라미터</span>
      </div>
    );
  }, [hostname, params.length]);

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
        toolName="URL 파서 & 쿼리스트링 빌더"
        categoryName="도구"
        categoryPath="/tools"
        onNavigate={onNavigate}
        miniWidgetContent={miniWidgetContent}
      />

      {/* 2. 복사 알림 토스트 (createPortal 기반 완벽한 CLS 0 방어) */}
      <FloatingToast message={copyToast} />

      <aside className="post-sidebar post-sidebar-left"></aside>

      <div className="post-detail-container" style={{ maxWidth: 1120, width: '100%', paddingBottom: 120 }}>
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
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
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
              <Link2 size={24} stroke="url(#toolIconGradient)" />
            </div>
            <div>
              <h1 style={{ fontSize: "1.75rem", fontWeight: 700, margin: 0, letterSpacing: "-0.03em" }}>
                URL 파서 & 쿼리스트링 빌더
              </h1>
              <p style={{ fontSize: "0.92rem", color: "#888", margin: 0, marginTop: 4 }}>
                URL의 프로토콜, 호스트, 경로, 쿼리 파라미터 분해 및 파라미터 실시간 추가·수정
              </p>
            </div>
          </div>
        </div>

        {/* 프리셋 바 */}
        <div className="jwt-presets-bar" style={{ marginBottom: 24 }}>
          <span className="jwt-presets-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Sparkles size={14} style={{ color: '#0395FC' }} />
            샘플 프리셋:
          </span>
          <div className="jwt-presets-list">
            {URL_SAMPLE_PRESETS.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleApplyPreset(preset.url)}
                className="jwt-preset-chip"
                title={preset.description}
              >
                <span>{preset.title}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="jwt-preset-chip jwt-chip-clear"
            style={{ marginLeft: 'auto' }}
            title="초기화"
          >
            <RotateCcw size={12} />
            <span>초기화</span>
          </button>
        </div>

        {/* 원본 URL 입력 카드 */}
        <div
          style={{
            marginBottom: 24,
            padding: 20,
            borderRadius: 16,
            background: 'var(--bg-card, rgba(255, 255, 255, 0.03))',
            border: '1px solid var(--border, rgba(255, 255, 255, 0.1))',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <label
            style={{
              fontSize: '0.82rem',
              fontWeight: 600,
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Globe size={16} style={{ color: '#0395FC' }} />
            <span>분해할 원본 URL 입력</span>
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="text"
              value={urlInput}
              onChange={(e) => handleUrlInputChange(e.target.value)}
              placeholder="https://example.com/api/v1/search?query=react&page=1#top"
              style={{
                width: '100%',
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid var(--border, rgba(255, 255, 255, 0.1))',
                borderRadius: 10,
                padding: '10px 14px',
                fontFamily: 'monospace',
                fontSize: '0.88rem',
                color: 'var(--text-main, #f1f5f9)',
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* 2단 구성: 기본 컴포넌트 분해 & 쿼리스트링 편집기 */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 20,
            marginBottom: 24,
          }}
        >
          {/* 좌측: URL 기본 구성요소 분해 (Protocol, Host, Port, Path, Hash) */}
          <div
            style={{
              padding: 20,
              borderRadius: 16,
              background: 'var(--bg-card, rgba(255, 255, 255, 0.03))',
              border: '1px solid var(--border, rgba(255, 255, 255, 0.1))',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: '0.9rem',
                fontWeight: 600,
                color: 'var(--text-main)',
              }}
            >
              <FolderTree size={16} style={{ color: '#0395FC' }} />
              <span>기본 구성요소 (Components)</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Protocol */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    marginBottom: 4,
                  }}
                >
                  Protocol
                </label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {['https', 'http', 'ws', 'wss'].map((proto) => (
                    <button
                      key={proto}
                      type="button"
                      onClick={() => setProtocol(proto)}
                      className={`jwt-preset-chip ${protocol === proto ? 'active' : ''}`}
                      style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                    >
                      {proto}://
                    </button>
                  ))}
                </div>
              </div>

              {/* Hostname */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    marginBottom: 4,
                  }}
                >
                  Hostname / Domain
                </label>
                <input
                  type="text"
                  value={hostname}
                  onChange={(e) => setHostname(e.target.value)}
                  placeholder="example.com"
                  style={{
                    width: '100%',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid var(--border, rgba(255, 255, 255, 0.1))',
                    borderRadius: 8,
                    padding: '8px 12px',
                    fontFamily: 'monospace',
                    fontSize: '0.85rem',
                    color: 'var(--text-main)',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Port */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    marginBottom: 4,
                  }}
                >
                  Port (선택)
                </label>
                <input
                  type="text"
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  placeholder="443, 8080 등"
                  style={{
                    width: '100%',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid var(--border, rgba(255, 255, 255, 0.1))',
                    borderRadius: 8,
                    padding: '8px 12px',
                    fontFamily: 'monospace',
                    fontSize: '0.85rem',
                    color: 'var(--text-main)',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Pathname */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    marginBottom: 4,
                  }}
                >
                  Path (경로)
                </label>
                <input
                  type="text"
                  value={pathname}
                  onChange={(e) => setPathname(e.target.value)}
                  placeholder="/api/v1/resource"
                  style={{
                    width: '100%',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid var(--border, rgba(255, 255, 255, 0.1))',
                    borderRadius: 8,
                    padding: '8px 12px',
                    fontFamily: 'monospace',
                    fontSize: '0.85rem',
                    color: 'var(--text-main)',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Hash / Fragment */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    marginBottom: 4,
                  }}
                >
                  Hash / Fragment (#)
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Hash
                    size={14}
                    style={{
                      position: 'absolute',
                      left: 10,
                      color: 'var(--text-muted)',
                      pointerEvents: 'none',
                    }}
                  />
                  <input
                    type="text"
                    value={hash}
                    onChange={(e) => setHash(e.target.value)}
                    placeholder="section-1"
                    style={{
                      width: '100%',
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid var(--border, rgba(255, 255, 255, 0.1))',
                      borderRadius: 8,
                      padding: '8px 12px 8px 30px',
                      fontFamily: 'monospace',
                      fontSize: '0.85rem',
                      color: 'var(--text-main)',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 우측: 쿼리스트링 파라미터 빌더 */}
          <div
            style={{
              padding: 20,
              borderRadius: 16,
              background: 'var(--bg-card, rgba(255, 255, 255, 0.03))',
              border: '1px solid var(--border, rgba(255, 255, 255, 0.1))',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  color: 'var(--text-main)',
                }}
              >
                <SlidersHorizontal size={16} style={{ color: '#0395FC' }} />
                <span>쿼리 파라미터 ({params.length}개)</span>
              </div>
              <button
                type="button"
                onClick={handleAddParam}
                style={{
                  padding: '5px 12px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  borderRadius: 8,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  background: 'rgba(1, 74, 255, 0.2)',
                  border: '1px solid rgba(1, 74, 255, 0.45)',
                  color: '#0395FC',
                  cursor: 'pointer',
                }}
              >
                <Plus size={14} />
                <span>파라미터 추가</span>
              </button>
            </div>

            {/* 파라미터 리스트 */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                maxHeight: 380,
                overflowY: 'auto',
                paddingRight: 4,
              }}
            >
              {params.length === 0 ? (
                <div
                  style={{
                    padding: '30px 10px',
                    textAlign: 'center',
                    color: 'var(--text-muted)',
                    fontSize: '0.85rem',
                    border: '1px dashed var(--border, rgba(255, 255, 255, 0.1))',
                    borderRadius: 10,
                  }}
                >
                  쿼리 파라미터가 없습니다. 상단 버튼으로 추가해보세요.
                </div>
              ) : (
                params.map((param) => (
                  <div
                    key={param.id}
                    style={{
                      padding: '8px 10px',
                      borderRadius: 8,
                      border: '1px solid var(--border, rgba(255, 255, 255, 0.08))',
                      background: param.enabled ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.25)',
                      opacity: param.enabled ? 1 : 0.6,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: '0.82rem',
                    }}
                  >
                    {/* 활성화 토글 */}
                    <button
                      type="button"
                      onClick={() => handleToggleParam(param.id)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 2,
                        color: param.enabled ? '#0395FC' : 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                      title={param.enabled ? '비활성화' : '활성화'}
                    >
                      {param.enabled ? <CheckSquare size={16} /> : <Square size={16} />}
                    </button>

                    {/* 키 입력 */}
                    <input
                      type="text"
                      value={param.key}
                      onChange={(e) => handleParamKeyChange(param.id, e.target.value)}
                      placeholder="Key"
                      style={{
                        width: '32%',
                        background: 'rgba(0, 0, 0, 0.3)',
                        border: '1px solid var(--border, rgba(255, 255, 255, 0.1))',
                        borderRadius: 6,
                        padding: '5px 8px',
                        fontFamily: 'monospace',
                        fontSize: '0.8rem',
                        color: 'var(--text-main)',
                        outline: 'none',
                      }}
                    />

                    {/* 등호 */}
                    <span style={{ color: 'var(--text-muted)', fontFamily: 'monospace' }}>=</span>

                    {/* 값 입력 */}
                    <input
                      type="text"
                      value={param.value}
                      onChange={(e) => handleParamValueChange(param.id, e.target.value)}
                      placeholder="Value"
                      style={{
                        flex: 1,
                        background: 'rgba(0, 0, 0, 0.3)',
                        border: '1px solid var(--border, rgba(255, 255, 255, 0.1))',
                        borderRadius: 6,
                        padding: '5px 8px',
                        fontFamily: 'monospace',
                        fontSize: '0.8rem',
                        color: 'var(--text-main)',
                        outline: 'none',
                      }}
                    />

                    {/* Encode / Decode 토글 */}
                    <button
                      type="button"
                      onClick={() => handleToggleEncodeValue(param.id)}
                      className="jwt-ghost-btn"
                      style={{
                        padding: '4px 6px',
                        fontSize: '0.68rem',
                        fontFamily: 'monospace',
                      }}
                      title="URL 인코딩/디코딩 변환"
                    >
                      Enc
                    </button>

                    {/* 삭제 버튼 */}
                    <button
                      type="button"
                      onClick={() => handleRemoveParam(param.id)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 4,
                        color: 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                      title="삭제"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* 하단: 재조합된 최종 완성 URL 카드 */}
        <div
          style={{
            padding: 22,
            borderRadius: 16,
            background: 'rgba(1, 74, 255, 0.06)',
            border: '1px solid rgba(1, 74, 255, 0.28)',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 10,
            }}
          >
            <span
              style={{
                fontSize: '0.88rem',
                fontWeight: 600,
                color: '#0395FC',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Link2 size={16} />
              <span>실시간 재조합 완성 URL</span>
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                type="button"
                onClick={handleCopy}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  borderRadius: 8,
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  background: 'rgba(1, 74, 255, 0.2)',
                  border: '1px solid rgba(1, 74, 255, 0.45)',
                  color: '#0395FC',
                  cursor: 'pointer',
                }}
              >
                <Copy size={14} />
                <span>복사</span>
              </button>
              <a
                href={reconstructedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="jwt-ghost-btn"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  textDecoration: 'none',
                }}
              >
                <ExternalLink size={14} />
                <span>새 탭 열기</span>
              </a>
            </div>
          </div>

          <div
            style={{
              padding: 14,
              borderRadius: 10,
              background: 'rgba(0, 0, 0, 0.5)',
              border: '1px solid var(--border, rgba(255, 255, 255, 0.1))',
              wordBreak: 'break-all',
              fontFamily: 'monospace',
              fontSize: '0.85rem',
              color: 'var(--text-main, #f1f5f9)',
              lineHeight: 1.6,
            }}
          >
            {reconstructedUrl || 'URL을 구성할 수 없습니다.'}
          </div>
        </div>
      </div>

      <aside className="post-sidebar post-sidebar-right"></aside>
    </motion.div>
  );
}
