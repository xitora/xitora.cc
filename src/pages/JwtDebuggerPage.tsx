import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  Key,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  Info,
  CheckCircle2,
  AlertTriangle,
  Eye,
  EyeOff,
  Code2,
} from 'lucide-react';
import FloatingToolHeader from '../components/FloatingToolHeader';
import FloatingToast from '../components/FloatingToast';
import {
  decodeJwt,
  evaluateTokenStatus,
  verifyHmacSignature,
  JWT_SAMPLE_PRESETS,
  DecodedJwt,
  TokenStatusInfo,
} from '../utils/jwt';

interface JwtDebuggerPageProps {
  onNavigate: (path: string) => void;
}

export default function JwtDebuggerPage({ onNavigate }: JwtDebuggerPageProps) {
  // 입력된 JWT 토큰 상태 (초기 상태는 비어있음, 프리셋 선택 시 로드)
  const [tokenInput, setTokenInput] = useState<string>('');
  // 서명 검증용 비밀키 (Secret Key)
  const [secretKey, setSecretKey] = useState<string>('');
  // 비밀키 표시/숨김 토글
  const [showSecret, setShowSecret] = useState<boolean>(false);
  // 복사 알림 토스트 텍스트
  const [copyToast, setCopyToast] = useState<string | null>(null);

  // 서명 검증 결과 상태
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verificationResult, setVerificationResult] = useState<{
    tested: boolean;
    valid: boolean;
    error?: string;
  }>({ tested: false, valid: false });

  // 토큰 디코딩
  const decodeResult = useMemo(() => {
    return decodeJwt(tokenInput);
  }, [tokenInput]);

  // 토큰 만료 상태 평가
  const tokenStatusInfo: TokenStatusInfo = useMemo(() => {
    if (!decodeResult.success) {
      return {
        status: tokenInput.trim() ? 'malformed' : 'empty',
        message: tokenInput.trim() ? '올바르지 않은 JWT 형식입니다.' : '토큰을 입력하세요.',
        isExpired: false,
      };
    }
    return evaluateTokenStatus(decodeResult.data.payload);
  }, [decodeResult, tokenInput]);

  // 서명 실시간 자동 검증 (비밀키가 있거나 변경될 때)
  useEffect(() => {
    let isCancelled = false;

    if (!decodeResult.success || !secretKey.trim()) {
      setVerificationResult({ tested: false, valid: false });
      setIsVerifying(false);
      return;
    }

    setIsVerifying(true);
    verifyHmacSignature(tokenInput, secretKey)
      .then((res) => {
        if (!isCancelled) {
          setVerificationResult({
            tested: true,
            valid: res.verified,
            error: res.error,
          });
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          setVerificationResult({
            tested: true,
            valid: false,
            error: (err as Error).message,
          });
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsVerifying(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [tokenInput, secretKey, decodeResult]);

  // 클립보드 복사 핸들러
  const handleCopyText = useCallback(async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyToast(`${label}이(가) 클립보드에 복사되었습니다.`);
      setTimeout(() => setCopyToast(null), 2500);
    } catch (err) {
      setCopyToast('복사하지 못했습니다. 브라우저의 클립보드 권한을 확인하세요.');
    }
  }, []);

  // 프리셋 로드 핸들러
  const handleLoadPreset = (presetId: string) => {
    const preset = JWT_SAMPLE_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      setTokenInput(preset.token);
      setSecretKey(preset.secret);
    }
  };

  // 인풋 초기화
  const handleClear = () => {
    setTokenInput('');
    setSecretKey('');
    setVerificationResult({ tested: false, valid: false });
  };

  // 상단 미니 위젯 내용 (FloatingToolHeader)
  const miniWidgetContent = useMemo(() => {
    if (!decodeResult.success) {
      return (
        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
          JWT 토큰을 입력해 주세요
        </span>
      );
    }
    const alg = decodeResult.data.header.alg || '알 수 없음';
    const isExp = tokenStatusInfo.isExpired;

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem' }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            color: isExp ? '#f87171' : '#34d399',
            fontWeight: 600,
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: isExp ? '#f87171' : '#34d399',
            }}
          />
          {isExp ? '만료됨' : '유효함'}
        </span>
        <span style={{ color: 'var(--border)' }}>|</span>
        <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{alg}</span>
      </div>
    );
  }, [decodeResult, tokenStatusInfo]);

  // 토큰 3단 색상 분해 세그먼트 (Header: 분홍, Payload: 보라, Signature: 파랑)
  const tokenParts = useMemo(() => {
    const parts = tokenInput.trim().split('.');
    return {
      header: parts[0] || '',
      payload: parts[1] || '',
      signature: parts[2] || '',
      hasValidParts: parts.length === 3,
    };
  }, [tokenInput]);

  return (
    <motion.div
      className="page-layout post-detail-layout"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* 1. 상단 모핑 플로팅 알약 (FloatingToolHeader) */}
      <FloatingToolHeader
        toolName="JWT 디코더 & 검증기"
        categoryName="도구"
        categoryPath="/tools"
        onNavigate={onNavigate}
        miniWidgetContent={miniWidgetContent}
      />

      {/* 2. 복사 성공 플로팅 토스트 (createPortal 기반 완벽한 CLS 0 방어) */}
      <FloatingToast message={copyToast} />

      <aside className="post-sidebar post-sidebar-left"></aside>

      <div className="post-detail-container" style={{ maxWidth: 1080, width: '100%', paddingBottom: 120 }}>
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
              <Key size={24} stroke="url(#toolIconGradient)" />
            </div>
            <div>
              <h1 style={{ fontSize: "1.75rem", fontWeight: 700, margin: 0, letterSpacing: "-0.03em" }}>
                JWT 디코더 & 검증기
              </h1>
              <p style={{ fontSize: "0.92rem", color: "#888", margin: 0, marginTop: 4 }}>
                Header / Payload 디코딩, 만료 시간(exp) 및 발급 시간(iat) 변환, 서명 유효성 검증
              </p>
            </div>
          </div>
        </div>

        {/* 샘플 프리셋 선택 칩 */}
        <div className="jwt-presets-bar">
          <span className="jwt-presets-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Sparkles size={14} style={{ color: '#0395FC' }} />
            샘플 프리셋:
          </span>
          <div className="jwt-presets-list">
            {JWT_SAMPLE_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleLoadPreset(preset.id)}
                className="jwt-preset-chip"
                title={preset.description}
              >
                <span>{preset.name}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="jwt-preset-chip jwt-chip-clear"
            style={{ marginLeft: 'auto' }}
            title="토큰 인풋 비우기"
          >
            <RotateCcw size={12} />
            <span>비우기</span>
          </button>
        </div>

        {/* 메인 2열 그리드 컨테이너 */}
        <div className="jwt-grid-layout">
          {/* ===================== 좌측: 인풋 & 서명 검증 ===================== */}
          <div className="jwt-col">
            {/* 1. 토큰 입력 창 */}
            <div className="jwt-card">
              <div className="jwt-card-header">
                <div className="jwt-card-title">
                  <Code2 size={16} color="#0395FC" />
                  <span>인코딩된 토큰 (Encoded JWT)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {tokenInput.trim() && (
                    <button
                      type="button"
                      onClick={() => handleCopyText(tokenInput, 'JWT 토큰')}
                      className="jwt-card-action-btn"
                      title="토큰 전체 복사"
                    >
                      <Copy size={13} />
                      <span>복사</span>
                    </button>
                  )}
                </div>
              </div>

              {/* 3단 컬러 범례 바 */}
              <div className="jwt-legend-bar">
                <span className="jwt-legend-tag tag-header">Header</span>
                <span className="jwt-legend-tag tag-payload">Payload</span>
                <span className="jwt-legend-tag tag-signature">Signature</span>
              </div>

              {/* 토큰 텍스트에어리어 */}
              <textarea
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="여기에 JWT 문자열(eyJhbGciOi...)을 붙여넣으세요..."
                className="jwt-textarea"
                rows={8}
                spellCheck={false}
              />

              {/* 3색 시각화 하이라이트 미리보기 (유효한 3단 구조일 때 표시) */}
              {tokenParts.hasValidParts && (
                <div className="jwt-colored-preview">
                  <span className="jwt-color-part color-header">{tokenParts.header}</span>
                  <span className="jwt-color-dot">.</span>
                  <span className="jwt-color-part color-payload">{tokenParts.payload}</span>
                  <span className="jwt-color-dot">.</span>
                  <span className="jwt-color-part color-signature">{tokenParts.signature}</span>
                </div>
              )}
            </div>

            {/* 2. HMAC 서명 검증 카드 */}
            <div className="jwt-card">
              <div className="jwt-card-header">
                <div className="jwt-card-title">
                  <Key size={16} color="#0395FC" />
                  <span>서명 검증 (Verify Signature)</span>
                </div>
                <span className="jwt-alg-badge">
                  {decodeResult.success ? decodeResult.data.header.alg || 'HS256' : 'HS256'}
                </span>
              </div>

              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0 0 12px', lineHeight: 1.5 }}>
                대칭키(Secret)를 입력하여 Web Crypto API(HMAC-SHA256)로 브라우저 내부에서 안전하게 서명을 직접 검증합니다.
                비밀키는 외부 서버로 전송되지 않습니다.
              </p>

              <div className="jwt-secret-input-wrapper">
                <input
                  type={showSecret ? 'text' : 'password'}
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  placeholder="비밀키(Secret Key) 입력..."
                  className="jwt-secret-input"
                  spellCheck={false}
                />
                <button
                  type="button"
                  onClick={() => setShowSecret((prev) => !prev)}
                  className="jwt-toggle-secret-btn"
                  title={showSecret ? '비밀키 숨기기' : '비밀키 표시하기'}
                >
                  {showSecret ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              {/* 서명 검증 결과 상태 표시기 */}
              <div className="jwt-verify-status-box">
                {isVerifying ? (
                  <div className="jwt-verify-state state-pending">
                    <span className="jwt-spinner" />
                    <span>서명 검증 중...</span>
                  </div>
                ) : !tokenInput.trim() ? (
                  <div className="jwt-verify-state state-neutral">
                    <Info size={14} />
                    <span>토큰을 입력하면 서명 검증이 활성화됩니다.</span>
                  </div>
                ) : !secretKey.trim() ? (
                  <div className="jwt-verify-state state-neutral">
                    <Info size={14} />
                    <span>비밀키를 입력하여 HMAC 서명의 무결성을 검증하세요.</span>
                  </div>
                ) : verificationResult.tested ? (
                  verificationResult.valid ? (
                    <div className="jwt-verify-state state-success">
                      <ShieldCheck size={16} />
                      <span>서명이 유효합니다 (Signature Verified)</span>
                    </div>
                  ) : (
                    <div className="jwt-verify-state state-error">
                      <ShieldAlert size={16} />
                      <span>
                        서명이 일치하지 않습니다 (Invalid Signature)
                        {verificationResult.error && ` · ${verificationResult.error}`}
                      </span>
                    </div>
                  )
                ) : null}
              </div>
            </div>
          </div>

          {/* ===================== 우측: 디코딩 결과 & 시간 정보 ===================== */}
          <div className="jwt-col">
            {/* 1. 토큰 유효성 및 만료 상태 배너 */}
            <div className={`jwt-status-banner status-${tokenStatusInfo.status}`}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {tokenStatusInfo.status === 'valid' ? (
                  <CheckCircle2 size={18} color="#34d399" />
                ) : tokenStatusInfo.status === 'expired' ? (
                  <AlertTriangle size={18} color="#f87171" />
                ) : (
                  <Info size={18} color="#0395FC" />
                )}
                <span style={{ fontWeight: 600, fontSize: '0.92rem' }}>
                  {tokenStatusInfo.message}
                </span>
              </div>
            </div>

            {/* 2. 시간 클레임 (iat, exp, nbf) 카드 */}
            {decodeResult.success && (tokenStatusInfo.expiresInText || tokenStatusInfo.issuedAtText) && (
              <div className="jwt-card">
                <div className="jwt-card-header">
                  <div className="jwt-card-title">
                    <Clock size={16} color="#0395FC" />
                    <span>시간 클레임 정보 (Local Time)</span>
                  </div>
                </div>

                <div className="jwt-time-claims-list">
                  {tokenStatusInfo.issuedAtText && (
                    <div className="jwt-time-row">
                      <span className="jwt-time-label">발급 시간 (iat)</span>
                      <span className="jwt-time-value">{tokenStatusInfo.issuedAtText}</span>
                    </div>
                  )}

                  {tokenStatusInfo.expiresInText && (
                    <div className="jwt-time-row">
                      <span className="jwt-time-label">만료 시간 (exp)</span>
                      <span
                        className="jwt-time-value"
                        style={{ color: tokenStatusInfo.isExpired ? '#f87171' : '#34d399' }}
                      >
                        {tokenStatusInfo.expiresInText}
                      </span>
                    </div>
                  )}

                  {tokenStatusInfo.notBeforeText && (
                    <div className="jwt-time-row">
                      <span className="jwt-time-label">유효 시작 (nbf)</span>
                      <span className="jwt-time-value">{tokenStatusInfo.notBeforeText}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 3. Header JSON 뷰어 */}
            <div className="jwt-card">
              <div className="jwt-card-header">
                <div className="jwt-card-title">
                  <span className="jwt-dot-indicator dot-header" />
                  <span>Header (헤더)</span>
                </div>
                {decodeResult.success && (
                  <button
                    type="button"
                    onClick={() => handleCopyText(decodeResult.data.headerJson, 'Header JSON')}
                    className="jwt-card-action-btn"
                    title="Header JSON 복사"
                  >
                    <Copy size={13} />
                    <span>복사</span>
                  </button>
                )}
              </div>

              {decodeResult.success ? (
                <pre className="jwt-json-pre color-header-bg">
                  <code>{decodeResult.data.headerJson}</code>
                </pre>
              ) : (
                <div className="jwt-error-placeholder">
                  {decodeResult.error || 'Header 데이터를 파싱할 수 없습니다.'}
                </div>
              )}
            </div>

            {/* 4. Payload JSON 뷰어 */}
            <div className="jwt-card">
              <div className="jwt-card-header">
                <div className="jwt-card-title">
                  <span className="jwt-dot-indicator dot-payload" />
                  <span>Payload (페이로드/데이터)</span>
                </div>
                {decodeResult.success && (
                  <button
                    type="button"
                    onClick={() => handleCopyText(decodeResult.data.payloadJson, 'Payload JSON')}
                    className="jwt-card-action-btn"
                    title="Payload JSON 복사"
                  >
                    <Copy size={13} />
                    <span>복사</span>
                  </button>
                )}
              </div>

              {decodeResult.success ? (
                <pre className="jwt-json-pre color-payload-bg">
                  <code>{decodeResult.data.payloadJson}</code>
                </pre>
              ) : (
                <div className="jwt-error-placeholder">
                  {decodeResult.error || 'Payload 데이터를 파싱할 수 없습니다.'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <aside className="post-sidebar post-sidebar-right"></aside>

      {/* 스타일시트 (다크 테마, 레이아웃, 반응형 디자인) */}
      <style>{`
        .jwt-grid-layout {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          align-items: start;
        }
        @media (max-width: 860px) {
          .jwt-grid-layout {
            grid-template-columns: 1fr;
            gap: 16px;
          }
        }

        .jwt-col {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .jwt-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 18px 20px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
          position: relative;
        }

        .jwt-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 12px;
        }
        .jwt-card-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.92rem;
          font-weight: 600;
          color: var(--text-main);
        }

        .jwt-card-action-btn {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 4px 9px;
          color: var(--text-muted);
          font-size: 0.78rem;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          transition: all 0.15s ease;
        }
        .jwt-card-action-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: var(--text-main);
        }

        .jwt-legend-bar {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 8px;
        }
        .jwt-legend-tag {
          font-size: 0.72rem;
          font-weight: 600;
          padding: 2px 7px;
          border-radius: 4px;
        }
        .tag-header {
          background: rgba(244, 63, 94, 0.15);
          color: #f43f5e;
          border: 1px solid rgba(244, 63, 94, 0.3);
        }
        .tag-payload {
          background: rgba(251, 191, 36, 0.15);
          color: #fbbf24;
          border: 1px solid rgba(251, 191, 36, 0.3);
        }
        .tag-signature {
          background: rgba(3, 149, 252, 0.15);
          color: #0395fc;
          border: 1px solid rgba(3, 149, 252, 0.3);
        }

        .jwt-textarea {
          width: 100%;
          background: rgba(0, 0, 0, 0.35);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 12px 14px;
          color: var(--text-main);
          font-family: var(--font-mono, Consolas, monospace);
          font-size: 0.84rem;
          line-height: 1.5;
          resize: vertical;
          outline: none;
          box-sizing: border-box;
          transition: border-color 0.2s;
        }
        .jwt-textarea:focus {
          border-color: rgba(1, 74, 255, 0.5);
        }

        .jwt-colored-preview {
          margin-top: 10px;
          padding: 10px 12px;
          background: rgba(0, 0, 0, 0.45);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          font-family: var(--font-mono, Consolas, monospace);
          font-size: 0.78rem;
          word-break: break-all;
          line-height: 1.5;
        }
        .color-header { color: #f43f5e; font-weight: 600; }
        .color-payload { color: #fbbf24; font-weight: 600; }
        .color-signature { color: #0395fc; font-weight: 600; }
        .jwt-color-dot { color: #71717a; font-weight: 700; margin: 0 1px; }

        .jwt-alg-badge {
          font-size: 0.75rem;
          font-weight: 700;
          color: #0395FC;
          background: rgba(1, 74, 255, 0.16);
          border: 1px solid rgba(1, 74, 255, 0.35);
          border-radius: 6px;
          padding: 2px 8px;
        }

        .jwt-secret-input-wrapper {
          display: flex;
          align-items: center;
          position: relative;
          margin-bottom: 12px;
        }
        .jwt-secret-input {
          width: 100%;
          background: rgba(0, 0, 0, 0.35);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 10px 42px 10px 12px;
          color: var(--text-main);
          font-family: var(--font-mono, Consolas, monospace);
          font-size: 0.85rem;
          outline: none;
          box-sizing: border-box;
          transition: border-color 0.2s;
        }
        .jwt-secret-input:focus {
          border-color: rgba(1, 74, 255, 0.5);
        }
        .jwt-toggle-secret-btn {
          position: absolute;
          right: 10px;
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4px;
        }
        .jwt-toggle-secret-btn:hover {
          color: var(--text-main);
        }

        .jwt-verify-status-box {
          border-radius: 8px;
          overflow: hidden;
        }
        .jwt-verify-state {
          padding: 10px 14px;
          border-radius: 8px;
          font-size: 0.85rem;
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 500;
        }
        .state-neutral {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border);
          color: var(--text-muted);
        }
        .state-success {
          background: rgba(52, 211, 153, 0.1);
          border: 1px solid rgba(52, 211, 153, 0.3);
          color: #34d399;
          font-weight: 600;
        }
        .state-error {
          background: rgba(248, 113, 113, 0.1);
          border: 1px solid rgba(248, 113, 113, 0.3);
          color: #f87171;
          font-weight: 600;
        }
        .state-pending {
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-muted);
        }

        .jwt-status-banner {
          border-radius: 14px;
          padding: 14px 18px;
          border: 1px solid var(--border);
        }
        .status-valid {
          background: rgba(52, 211, 153, 0.1);
          border-color: rgba(52, 211, 153, 0.3);
          color: #34d399;
        }
        .status-expired {
          background: rgba(248, 113, 113, 0.1);
          border-color: rgba(248, 113, 113, 0.3);
          color: #f87171;
        }
        .status-future {
          background: rgba(251, 191, 36, 0.1);
          border-color: rgba(251, 191, 36, 0.3);
          color: #fbbf24;
        }
        .status-malformed, .status-empty {
          background: rgba(255, 255, 255, 0.04);
          border-color: var(--border);
          color: var(--text-muted);
        }

        .jwt-time-claims-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .jwt-time-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.84rem;
          padding-bottom: 8px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }
        .jwt-time-row:last-child {
          border-bottom: none;
          padding-bottom: 0;
        }
        .jwt-time-label {
          color: var(--text-muted);
          font-weight: 500;
        }
        .jwt-time-value {
          font-family: var(--font-mono, Consolas, monospace);
          font-weight: 600;
          color: var(--text-main);
        }

        .jwt-dot-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }
        .dot-header { background: #f43f5e; box-shadow: 0 0 8px rgba(244, 63, 94, 0.6); }
        .dot-payload { background: #fbbf24; box-shadow: 0 0 8px rgba(251, 191, 36, 0.6); }

        .jwt-json-pre {
          background: rgba(0, 0, 0, 0.4);
          border-radius: 10px;
          padding: 14px 16px;
          margin: 0;
          overflow-x: auto;
          font-family: var(--font-mono, Consolas, monospace);
          font-size: 0.84rem;
          line-height: 1.5;
        }
        .color-header-bg {
          border: 1px solid rgba(244, 63, 94, 0.2);
          color: #fecdd3;
        }
        .color-payload-bg {
          border: 1px solid rgba(251, 191, 36, 0.2);
          color: #fef3c7;
        }

        .jwt-error-placeholder {
          padding: 24px 16px;
          text-align: center;
          color: var(--text-muted);
          font-size: 0.85rem;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 8px;
        }

        .jwt-spinner {
          display: inline-block;
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255, 255, 255, 0.2);
          border-top-color: #0395FC;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
      `}</style>
    </motion.div>
  );
}
