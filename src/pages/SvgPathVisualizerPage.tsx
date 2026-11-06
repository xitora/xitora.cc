import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  Spline,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  Code,
} from 'lucide-react';
import FloatingToolHeader from '../components/FloatingToolHeader';
import FloatingToast from '../components/FloatingToast';
import {
  parseSvgPath,
  SVG_PATH_PRESETS,
} from '../utils/svgPath';

interface SvgPathVisualizerPageProps {
  onNavigate: (path: string) => void;
}

export default function SvgPathVisualizerPage({ onNavigate }: SvgPathVisualizerPageProps) {
  // SVG Path d 속성 입력값 (프리셋 선택 전에는 비어있음)
  const [pathInput, setPathInput] = useState<string>('');

  // 시각화 옵션
  const [showFill, setShowFill] = useState<boolean>(true);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [showEndpoints, setShowEndpoints] = useState<boolean>(true);
  const [showHandles, setShowHandles] = useState<boolean>(true);
  const [showLabels, setShowLabels] = useState<boolean>(true);

  // 호버/선택된 세그먼트 인덱스
  const [hoveredSegIndex, setHoveredSegIndex] = useState<number | null>(null);

  // 스트로크/채우기 색상
  const fillColor = '#014AFF';
  const strokeColor = '#0395FC';

  // 토스트 메시지
  const [copyToast, setCopyToast] = useState<string | null>(null);

  // Path 분석 결과 계산
  const analysis = useMemo(() => {
    return parseSvgPath(pathInput);
  }, [pathInput]);

  // viewBox 계산
  const viewBoxStr = useMemo(() => {
    const { minX, minY, width, height } = analysis.boundingBox;
    return `${minX} ${minY} ${width} ${height}`;
  }, [analysis]);

  // 프리셋 적용
  const handleApplyPreset = (d: string) => {
    setPathInput(d);
  };

  // 초기화
  const handleReset = () => {
    setPathInput('');
  };

  // 클립보드 복사
  const handleCopyText = useCallback(async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyToast(`${label} 클립보드에 복사되었습니다.`);
      setTimeout(() => setCopyToast(null), 2000);
    } catch {
      setCopyToast('복사 권한이 없어 실패했습니다.');
      setTimeout(() => setCopyToast(null), 2000);
    }
  }, []);

  // 완전한 SVG 태그 생성
  const fullSvgTag = useMemo(() => {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBoxStr}" width="200" height="200">
  <path d="${pathInput.trim()}" fill="${showFill ? fillColor : 'none'}" stroke="${strokeColor}" stroke-width="2" />
</svg>`;
  }, [viewBoxStr, pathInput, showFill, strokeColor]);

  // 미니 위젯 내용
  const miniWidgetContent = useMemo(() => {
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
        <span style={{ color: '#0395FC', fontWeight: 700 }}>{analysis.segments.length}개 세그먼트</span>
        <span style={{ color: 'var(--border)' }}>|</span>
        <span style={{ color: '#38bdf8', fontWeight: 600 }}>베지어 {analysis.bezierCount}개</span>
      </div>
    );
  }, [analysis.segments.length, analysis.bezierCount]);

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
        toolName="SVG 경로(Path) 비주얼라이저"
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
        <div style={{ marginBottom: 28, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
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
              <Spline size={24} stroke="url(#toolIconGradient)" />
            </div>
            <div>
              <h1 style={{ fontSize: "1.75rem", fontWeight: 700, margin: 0, letterSpacing: "-0.03em" }}>
                SVG 경로(Path) 비주얼라이저
              </h1>
              <p style={{ fontSize: "0.92rem", color: "#888", margin: 0, marginTop: 4 }}>
                복잡한 SVG Path(d 속성) 코드를 붙여넣어 노드와 베지어 곡선 포인트를 시각적으로 분해·검사
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleCopyText(fullSvgTag, 'SVG 태그가')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 10,
              fontSize: '0.82rem',
              fontWeight: 600,
              background: 'rgba(1, 74, 255, 0.2)',
              border: '1px solid rgba(1, 74, 255, 0.45)',
              color: '#0395FC',
              cursor: 'pointer',
            }}
          >
            <Code size={14} />
            <span>SVG 코드 복사</span>
          </button>
        </div>

        {/* 프리셋 바 */}
        <div className="jwt-presets-bar" style={{ marginBottom: 24 }}>
          <span className="jwt-presets-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Sparkles size={14} style={{ color: '#0395FC' }} />
            샘플 프리셋:
          </span>
          <div className="jwt-presets-list">
            {SVG_PATH_PRESETS.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleApplyPreset(preset.d)}
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
            title="입력값 초기화"
          >
            <RotateCcw size={12} />
            <span>초기화</span>
          </button>
        </div>

        {/* Path 입력창 카드 */}
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
          <div style={{ display: 'flex', alignItems: 'center', justifySelf: 'stretch', justifyContent: 'space-between' }}>
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
              <Spline size={16} style={{ color: '#0395FC' }} />
              <span>SVG Path d 속성 코드 입력</span>
            </label>
            <button
              type="button"
              onClick={() => handleCopyText(pathInput, 'Path d 코드가')}
              className="jwt-ghost-btn"
              style={{
                fontSize: '0.78rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Copy size={13} />
              <span>d 속성 복사</span>
            </button>
          </div>
          <textarea
            rows={3}
            value={pathInput}
            onChange={(e) => setPathInput(e.target.value)}
            placeholder="M 10 20 L 50 60 C 70 80, 90 100, 120 120 Z"
            style={{
              width: '100%',
              background: 'rgba(0, 0, 0, 0.4)',
              border: '1px solid var(--border, rgba(255, 255, 255, 0.1))',
              borderRadius: 10,
              padding: '12px 14px',
              fontFamily: 'monospace',
              fontSize: '0.82rem',
              color: 'var(--text-main, #f1f5f9)',
              outline: 'none',
              resize: 'none',
              lineHeight: 1.5,
            }}
          />
        </div>

        {/* 2단 레이아웃: 좌측 인터랙티브 SVG 뷰포트 / 우측 세그먼트 검사기 */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 20,
            alignItems: 'start',
          }}
        >
          {/* 좌측: 인터랙티브 뷰포트 */}
          <div
            style={{
              padding: 22,
              borderRadius: 16,
              background: 'var(--bg-card, rgba(255, 255, 255, 0.03))',
              border: '1px solid var(--border, rgba(255, 255, 255, 0.1))',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            {/* 뷰어 컨트롤 바 */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                paddingBottom: 12,
                borderBottom: '1px solid var(--border, rgba(255, 255, 255, 0.1))',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 12, fontSize: '0.78rem' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>레이어:</span>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer', color: 'var(--text-muted)' }}>
                  <input
                    type="checkbox"
                    checked={showGrid}
                    onChange={(e) => setShowGrid(e.target.checked)}
                    style={{ accentColor: '#014AFF' }}
                  />
                  <span>그리드</span>
                </label>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer', color: 'var(--text-muted)' }}>
                  <input
                    type="checkbox"
                    checked={showFill}
                    onChange={(e) => setShowFill(e.target.checked)}
                    style={{ accentColor: '#014AFF' }}
                  />
                  <span>채우기</span>
                </label>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer', color: 'var(--text-muted)' }}>
                  <input
                    type="checkbox"
                    checked={showEndpoints}
                    onChange={(e) => setShowEndpoints(e.target.checked)}
                    style={{ accentColor: '#014AFF' }}
                  />
                  <span>노드</span>
                </label>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer', color: 'var(--text-muted)' }}>
                  <input
                    type="checkbox"
                    checked={showHandles}
                    onChange={(e) => setShowHandles(e.target.checked)}
                    style={{ accentColor: '#014AFF' }}
                  />
                  <span>베지어 핸들</span>
                </label>
              </div>

              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                ViewBox: {viewBoxStr}
              </div>
            </div>

            {/* 실제 렌더링 SVG 캔버스 영역 */}
            <div
              style={{
                position: 'relative',
                width: '100%',
                height: 420,
                borderRadius: 12,
                border: '1px solid var(--border, rgba(255, 255, 255, 0.1))',
                background: '#07090e',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                padding: 16,
              }}
            >
              {analysis.isValid ? (
                <svg
                  viewBox={viewBoxStr}
                  style={{ width: '100%', height: '100%', maxHeight: 380, overflow: 'visible', userSelect: 'none' }}
                >
                  <defs>
                    <pattern id="gridPattern" width="20" height="20" patternUnits="userSpaceOnUse">
                      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="0.5" />
                    </pattern>
                  </defs>

                  {/* 1. 배경 그리드 */}
                  {showGrid && (
                    <rect
                      x={analysis.boundingBox.minX}
                      y={analysis.boundingBox.minY}
                      width={analysis.boundingBox.width}
                      height={analysis.boundingBox.height}
                      fill="url(#gridPattern)"
                    />
                  )}

                  {/* 2. 메인 패스 */}
                  <path
                    d={pathInput}
                    fill={showFill ? `${fillColor}22` : 'none'}
                    stroke={strokeColor}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* 3. 베지어 제어점 핸들 */}
                  {showHandles &&
                    analysis.segments.map((seg) => {
                      if (seg.controlPoints.length === 0) return null;
                      const isHovered = hoveredSegIndex === seg.index;
                      return (
                        <g key={`handle-${seg.index}`}>
                          {seg.controlPoints[0] && (
                            <line
                              x1={seg.startPoint.x}
                              y1={seg.startPoint.y}
                              x2={seg.controlPoints[0].x}
                              y2={seg.controlPoints[0].y}
                              stroke="#f59e0b"
                              strokeWidth={isHovered ? '2' : '1'}
                              strokeDasharray="3 3"
                            />
                          )}
                          {seg.controlPoints[1] && (
                            <line
                              x1={seg.controlPoints[1].x}
                              y1={seg.controlPoints[1].y}
                              x2={seg.endPoint.x}
                              y2={seg.endPoint.y}
                              stroke="#f59e0b"
                              strokeWidth={isHovered ? '2' : '1'}
                              strokeDasharray="3 3"
                            />
                          )}
                          {seg.controlPoints.map((cp, cpIdx) => (
                            <circle
                              key={`cp-${seg.index}-${cpIdx}`}
                              cx={cp.x}
                              cy={cp.y}
                              r={isHovered ? 4.5 : 3}
                              fill="#f59e0b"
                              stroke="#ffffff"
                              strokeWidth="1.5"
                            />
                          ))}
                        </g>
                      );
                    })}

                  {/* 4. 노드 끝점(Endpoint) */}
                  {showEndpoints &&
                    analysis.segments.map((seg) => {
                      const isHovered = hoveredSegIndex === seg.index;
                      const nodeR = Math.max(analysis.boundingBox.width / 45, 2.5);
                      const fontSz = Math.max(analysis.boundingBox.width / 35, 3);
                      return (
                        <g
                          key={`node-${seg.index}`}
                          onMouseEnter={() => setHoveredSegIndex(seg.index)}
                          onMouseLeave={() => setHoveredSegIndex(null)}
                          style={{ cursor: 'pointer' }}
                        >
                          <circle
                            cx={seg.endPoint.x}
                            cy={seg.endPoint.y}
                            r={isHovered ? nodeR * 1.5 : nodeR}
                            fill={isHovered ? '#34d399' : '#0395FC'}
                            stroke="#0f172a"
                            strokeWidth={Math.max(nodeR / 3, 0.8)}
                          />
                          {showLabels && (
                            <text
                              x={seg.endPoint.x + nodeR * 1.2}
                              y={seg.endPoint.y - nodeR * 1.2}
                              fill="#94a3b8"
                              fontSize={fontSz}
                              fontFamily="monospace"
                              fontWeight="bold"
                            >
                              {seg.index + 1}
                            </text>
                          )}
                        </g>
                      );
                    })}
                </svg>
              ) : (
                <div style={{ textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-muted)', padding: 24 }}>
                  {pathInput.trim() === ''
                    ? 'SVG Path 코드를 입력하거나 상단 샘플 프리셋을 선택하세요.'
                    : (analysis.errorMessage || '올바른 SVG Path가 아닙니다.')}
                </div>
              )}
            </div>

            {/* 범례 */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16, fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#0395FC', display: 'inline-block' }} />
                <span>앵커 끝점 (End Node)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
                <span>베지어 제어점 (CP Handle)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#34d399', display: 'inline-block' }} />
                <span>선택/호버된 노드</span>
              </div>
            </div>
          </div>

          {/* 우측: 세그먼트 분석 테이블 & 요약 통계 */}
          <div
            style={{
              padding: 22,
              borderRadius: 16,
              background: 'var(--bg-card, rgba(255, 255, 255, 0.03))',
              border: '1px solid var(--border, rgba(255, 255, 255, 0.1))',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            {/* 요약 통계 뱃지 */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 8,
                paddingBottom: 12,
                borderBottom: '1px solid var(--border, rgba(255, 255, 255, 0.1))',
                textAlign: 'center',
              }}
            >
              <div style={{ padding: '8px', borderRadius: 10, background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border, rgba(255, 255, 255, 0.05))' }}>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>총 세그먼트</span>
                <span style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', fontFamily: 'monospace' }}>
                  {analysis.segments.length}
                </span>
              </div>
              <div style={{ padding: '8px', borderRadius: 10, background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border, rgba(255, 255, 255, 0.05))' }}>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>베지어 곡선</span>
                <span style={{ fontSize: '1.05rem', fontWeight: 700, color: '#38bdf8', fontFamily: 'monospace' }}>
                  {analysis.bezierCount}
                </span>
              </div>
              <div style={{ padding: '8px', borderRadius: 10, background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border, rgba(255, 255, 255, 0.05))' }}>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>직선(Lines)</span>
                <span style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0395FC', fontFamily: 'monospace' }}>
                  {analysis.lineCount}
                </span>
              </div>
            </div>

            <h2
              style={{
                fontSize: '0.88rem',
                fontWeight: 600,
                color: 'var(--text-main)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                margin: 0,
              }}
            >
              <span>세그먼트 명령어 분해</span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 400 }}>행 클릭 시 복사</span>
            </h2>

            {/* 세그먼트 목록 테이블 */}
            <div
              style={{
                overflowY: 'auto',
                maxHeight: 340,
                borderRadius: 10,
                border: '1px solid var(--border, rgba(255, 255, 255, 0.1))',
                background: 'rgba(0, 0, 0, 0.4)',
              }}
            >
              <table style={{ width: '100%', textAlign: 'left', fontSize: '0.75rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'rgba(255, 255, 255, 0.04)', borderBottom: '1px solid var(--border, rgba(255, 255, 255, 0.1))', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '6px 10px', textAlign: 'center', width: 28 }}>#</th>
                    <th style={{ padding: '6px 10px', textAlign: 'center', width: 44 }}>Cmd</th>
                    <th style={{ padding: '6px 10px' }}>End (X, Y)</th>
                    <th style={{ padding: '6px 10px' }}>제어점 / 세부 인수</th>
                  </tr>
                </thead>
                <tbody style={{ fontFamily: 'monospace', fontSize: '0.74rem' }}>
                  {analysis.segments.map((seg) => {
                    const isHovered = hoveredSegIndex === seg.index;
                    return (
                      <tr
                        key={seg.index}
                        onMouseEnter={() => setHoveredSegIndex(seg.index)}
                        onMouseLeave={() => setHoveredSegIndex(null)}
                        onClick={() => handleCopyText(seg.rawString, `명령어 '${seg.rawString}'가`)}
                        style={{
                          cursor: 'pointer',
                          background: isHovered ? 'rgba(1, 74, 255, 0.18)' : 'transparent',
                          color: isHovered ? '#ffffff' : 'var(--text-main)',
                          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                          transition: 'background 0.15s',
                        }}
                      >
                        <td style={{ padding: '6px 10px', textAlign: 'center', color: 'var(--text-muted)' }}>
                          {seg.index + 1}
                        </td>
                        <td style={{ padding: '6px 10px', textAlign: 'center', fontWeight: 700, color: '#0395FC' }}>
                          {seg.command}
                        </td>
                        <td style={{ padding: '6px 10px', whiteSpace: 'nowrap' }}>
                          {seg.endPoint.x.toFixed(1)}, {seg.endPoint.y.toFixed(1)}
                        </td>
                        <td
                          style={{
                            padding: '6px 10px',
                            color: 'var(--text-muted)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: 140,
                          }}
                          title={seg.rawString}
                        >
                          {seg.controlPoints.length > 0
                            ? `CP: ${seg.controlPoints.map((cp) => `(${cp.x.toFixed(1)},${cp.y.toFixed(1)})`).join(' ')}`
                            : seg.args.join(', ')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <aside className="post-sidebar post-sidebar-right"></aside>
    </motion.div>
  );
}
