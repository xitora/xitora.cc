import React, { useState, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  Sparkles,
  Play,
  RotateCcw,
  Copy,
  Check,
  Repeat,
  Activity,
  Sliders,
} from 'lucide-react';
import FloatingToolHeader from '../components/FloatingToolHeader';
import FloatingToast from '../components/FloatingToast';
import {
  CubicBezierHandle,
  EASING_PRESETS,
  formatCubicBezier,
  generateCssTransition,
  generateTailwindClass,
  generateFramerMotionSnippet,
  generateWaapiSnippet,
} from '../utils/easing';

interface CssEasingSandboxPageProps {
  onNavigate: (path: string) => void;
}

export default function CssEasingSandboxPage({ onNavigate }: CssEasingSandboxPageProps) {
  // Cubic Bezier 핸들 좌표 (기본값: Ease)
  const [p1, setP1] = useState<CubicBezierHandle>({ x: 0.25, y: 0.1 });
  const [p2, setP2] = useState<CubicBezierHandle>({ x: 0.25, y: 1.0 });

  // 지속 시간 (초)
  const [duration, setDuration] = useState<number>(0.6);

  // 반복 재생 여부
  const [isLooping, setIsLooping] = useState<boolean>(true);

  // 애니메이션 트리거 키
  const [animTrigger, setAnimTrigger] = useState<number>(0);

  // 코드 출력 탭 ('css' | 'tailwind' | 'framer' | 'waapi')
  const [codeTab, setCodeTab] = useState<'css' | 'tailwind' | 'framer' | 'waapi'>('css');

  // 토스트 메시지
  const [copyToast, setCopyToast] = useState<string | null>(null);

  // 드래그 중인 핸들 ('p1' | 'p2' | null)
  const [draggingHandle, setDraggingHandle] = useState<'p1' | 'p2' | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // 현재 cubic-bezier CSS 문자열
  const bezierCss = formatCubicBezier(p1.x, p1.y, p2.x, p2.y);

  // SVG 좌표계 상수 (250x250)
  const CANVAS_SIZE = 250;
  const PADDING = 35;
  const GRAPH_SIZE = CANVAS_SIZE - PADDING * 2;

  // 정규화 좌표(0~1)를 SVG 픽셀 좌표로 변환 (Y축 반전)
  const toSvgX = (x: number) => PADDING + x * GRAPH_SIZE;
  const toSvgY = (y: number) => PADDING + (1 - y) * GRAPH_SIZE;

  // SVG 픽셀 좌표를 정규화 좌표로 역변환
  const fromSvgCoords = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } => {
      if (!svgRef.current) return { x: 0, y: 0 };
      const rect = svgRef.current.getBoundingClientRect();
      const rawX = ((clientX - rect.left) / rect.width) * CANVAS_SIZE;
      const rawY = ((clientY - rect.top) / rect.height) * CANVAS_SIZE;

      const normX = Math.min(Math.max((rawX - PADDING) / GRAPH_SIZE, 0), 1);
      // Y는 오버슈트 허용 (-0.5 ~ 1.5)
      const normY = Math.min(Math.max(1 - (rawY - PADDING) / GRAPH_SIZE, -0.5), 1.5);

      return {
        x: Math.round(normX * 100) / 100,
        y: Math.round(normY * 100) / 100,
      };
    },
    [GRAPH_SIZE, PADDING]
  );

  // 포인터 이동 (드래그)
  const handlePointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!draggingHandle) return;
      const { x, y } = fromSvgCoords(e.clientX, e.clientY);
      if (draggingHandle === 'p1') {
        setP1({ x, y });
      } else if (draggingHandle === 'p2') {
        setP2({ x, y });
      }
    },
    [draggingHandle, fromSvgCoords]
  );

  const handlePointerUp = () => {
    setDraggingHandle(null);
  };

  // 프리셋 선택
  const handleSelectPreset = (preset: (typeof EASING_PRESETS)[0]) => {
    setP1({ ...preset.p1 });
    setP2({ ...preset.p2 });
    setAnimTrigger((k) => k + 1);
  };

  // 애니메이션 수동 재실행
  const handleReplay = () => {
    setAnimTrigger((k) => k + 1);
  };

  // 초기화 (기본 Ease)
  const handleReset = () => {
    setP1({ x: 0.25, y: 0.1 });
    setP2({ x: 0.25, y: 1.0 });
    setDuration(0.6);
  };

  // 클립보드 복사
  const handleCopyCode = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyToast('코드가 클립보드에 복사되었습니다.');
      setTimeout(() => setCopyToast(null), 2000);
    } catch {
      setCopyToast('복사 권한이 없어 실패했습니다.');
      setTimeout(() => setCopyToast(null), 2000);
    }
  };

  // 선택된 탭의 코드 생성
  const currentCode = (() => {
    switch (codeTab) {
      case 'css':
        return generateCssTransition(duration, p1.x, p1.y, p2.x, p2.y);
      case 'tailwind':
        return generateTailwindClass(p1.x, p1.y, p2.x, p2.y);
      case 'framer':
        return generateFramerMotionSnippet(duration, p1.x, p1.y, p2.x, p2.y);
      case 'waapi':
        return generateWaapiSnippet(duration, p1.x, p1.y, p2.x, p2.y);
      default:
        return '';
    }
  })();

  // SVG 곡선 패스 d 문자열
  const curvePathD = `M ${toSvgX(0)} ${toSvgY(0)} C ${toSvgX(p1.x)} ${toSvgY(p1.y)}, ${toSvgX(p2.x)} ${toSvgY(p2.y)}, ${toSvgX(1)} ${toSvgY(1)}`;

  // 미니 위젯 내용
  const miniWidgetContent = useMemo(() => {
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
        <span style={{ color: '#0395FC', fontWeight: 700, fontFamily: 'monospace' }}>
          {bezierCss}
        </span>
        <span style={{ color: 'var(--border)' }}>|</span>
        <span style={{ color: '#ccc', fontWeight: 600 }}>{duration.toFixed(1)}s</span>
      </div>
    );
  }, [bezierCss, duration]);

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
        toolName="CSS 애니메이션 이징(Easing) 샌드박스"
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
              <Activity size={24} stroke="url(#toolIconGradient)" />
            </div>
            <div>
              <h1 style={{ fontSize: "1.75rem", fontWeight: 700, margin: 0, letterSpacing: "-0.03em" }}>
                CSS 애니메이션 이징(Easing) 샌드박스
              </h1>
              <p style={{ fontSize: "0.92rem", color: "#888", margin: 0, marginTop: 4 }}>
                cubic-bezier 커브를 인터랙티브하게 조절하며 UI 전환 프리뷰 및 코드 추출
              </p>
            </div>
          </div>
        </div>

        {/* 프리셋 바 */}
        <div className="jwt-presets-bar" style={{ marginBottom: 24 }}>
          <span className="jwt-presets-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Sparkles size={14} style={{ color: '#0395FC' }} />
            표준 이징 프리셋:
          </span>
          <div className="jwt-presets-list">
            {EASING_PRESETS.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectPreset(preset)}
                className="jwt-preset-chip"
                title={preset.description}
              >
                <span>{preset.name}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="jwt-preset-chip jwt-chip-clear"
            style={{ marginLeft: 'auto' }}
          >
            <RotateCcw size={13} />
            <span>초기화</span>
          </button>
        </div>

        {/* 2단 구성: 좌측 커브 에디터 / 우측 모션 프리뷰 & 코드 추출 */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 20,
            alignItems: 'start',
          }}
        >
          {/* 좌측: 인터랙티브 베지어 커브 캔버스 */}
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
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 8,
                paddingBottom: 12,
                borderBottom: '1px solid var(--border, rgba(255, 255, 255, 0.1))',
              }}
            >
              <h2
                style={{
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  color: 'var(--text-main)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  margin: 0,
                  whiteSpace: 'nowrap',
                }}
              >
                <Sliders size={16} style={{ color: '#0395FC' }} />
                <span>커브 편집기</span>
              </h2>
              <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#0395FC', fontWeight: 600, whiteSpace: 'nowrap' }}>
                {bezierCss}
              </span>
            </div>

            {/* SVG 인터랙티브 드래그 뷰어 */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
              <svg
                ref={svgRef}
                viewBox={`0 0 ${CANVAS_SIZE} ${CANVAS_SIZE}`}
                style={{
                  width: '100%',
                  maxWidth: 280,
                  height: 280,
                  userSelect: 'none',
                  borderRadius: 12,
                  border: '1px solid var(--border, rgba(255, 255, 255, 0.1))',
                  background: '#07090e',
                  touchAction: 'none',
                }}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
              >
                {/* 배경 가이드 라인 & 그리드 */}
                <rect
                  x={PADDING}
                  y={PADDING}
                  width={GRAPH_SIZE}
                  height={GRAPH_SIZE}
                  fill="rgba(255, 255, 255, 0.02)"
                  stroke="rgba(255, 255, 255, 0.1)"
                  strokeDasharray="3 3"
                />
                {/* 대각선 기준선 (Linear) */}
                <line
                  x1={toSvgX(0)}
                  y1={toSvgY(0)}
                  x2={toSvgX(1)}
                  y2={toSvgY(1)}
                  stroke="rgba(255, 255, 255, 0.15)"
                  strokeWidth="1"
                />

                {/* 핸들 1 연결선 (P1 -> 0,0) */}
                <line
                  x1={toSvgX(0)}
                  y1={toSvgY(0)}
                  x2={toSvgX(p1.x)}
                  y2={toSvgY(p1.y)}
                  stroke="#0395FC"
                  strokeWidth="2"
                />
                {/* 핸들 2 연결선 (P2 -> 1,1) */}
                <line
                  x1={toSvgX(1)}
                  y1={toSvgY(1)}
                  x2={toSvgX(p2.x)}
                  y2={toSvgY(p2.y)}
                  stroke="#34d399"
                  strokeWidth="2"
                />

                {/* 실제 Cubic-Bezier 곡선 */}
                <path
                  d={curvePathD}
                  fill="none"
                  stroke="#014AFF"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />

                {/* 시작점 & 끝점 고정 마커 */}
                <circle cx={toSvgX(0)} cy={toSvgY(0)} r="4" fill="#94a3b8" />
                <circle cx={toSvgX(1)} cy={toSvgY(1)} r="4" fill="#94a3b8" />

                {/* 제어점 P1 마커 (드래그 가능) */}
                <g
                  onPointerDown={(e) => {
                    e.currentTarget.setPointerCapture(e.pointerId);
                    setDraggingHandle('p1');
                  }}
                  style={{ cursor: 'grab' }}
                >
                  <circle
                    cx={toSvgX(p1.x)}
                    cy={toSvgY(p1.y)}
                    r="8"
                    fill="#0395FC"
                    stroke="#ffffff"
                    strokeWidth="2"
                  />
                  <text
                    x={toSvgX(p1.x) + 12}
                    y={toSvgY(p1.y) + 4}
                    fill="#0395FC"
                    fontSize="10"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    P1
                  </text>
                </g>

                {/* 제어점 P2 마커 (드래그 가능) */}
                <g
                  onPointerDown={(e) => {
                    e.currentTarget.setPointerCapture(e.pointerId);
                    setDraggingHandle('p2');
                  }}
                  style={{ cursor: 'grab' }}
                >
                  <circle
                    cx={toSvgX(p2.x)}
                    cy={toSvgY(p2.y)}
                    r="8"
                    fill="#34d399"
                    stroke="#ffffff"
                    strokeWidth="2"
                  />
                  <text
                    x={toSvgX(p2.x) + 12}
                    y={toSvgY(p2.y) + 4}
                    fill="#34d399"
                    fontSize="10"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    P2
                  </text>
                </g>
              </svg>
            </div>

            {/* 수치 슬라이더 및 세부 조절 */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                paddingTop: 10,
                borderTop: '1px solid var(--border, rgba(255, 255, 255, 0.1))',
                fontSize: '0.78rem',
                fontFamily: 'monospace',
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ padding: '8px 10px', borderRadius: 8, background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <span style={{ color: '#0395FC', fontWeight: 600, display: 'block', marginBottom: 2 }}>P1 (시작)</span>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-main)' }}>
                    <span>X: {p1.x.toFixed(2)}</span>
                    <span>Y: {p1.y.toFixed(2)}</span>
                  </div>
                </div>
                <div style={{ padding: '8px 10px', borderRadius: 8, background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <span style={{ color: '#34d399', fontWeight: 600, display: 'block', marginBottom: 2 }}>P2 (종료)</span>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-main)' }}>
                    <span>X: {p2.x.toFixed(2)}</span>
                    <span>Y: {p2.y.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* 시간 및 루프 설정 */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)', fontFamily: 'sans-serif' }}>시간 (Duration):</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="range"
                    min="0.2"
                    max="2.5"
                    step="0.1"
                    value={duration}
                    onChange={(e) => setDuration(parseFloat(e.target.value))}
                    style={{ width: 90, accentColor: '#014AFF' }}
                  />
                  <span style={{ color: 'var(--text-main)', width: 36, textAlign: 'right' }}>{duration.toFixed(1)}s</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)', fontFamily: 'sans-serif' }}>반복 (Loop) 재생:</span>
                <button
                  type="button"
                  onClick={() => setIsLooping(!isLooping)}
                  className="jwt-ghost-btn"
                  style={{
                    padding: '4px 10px',
                    fontSize: '0.74rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    background: isLooping ? 'rgba(1, 74, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    borderColor: isLooping ? 'rgba(1, 74, 255, 0.45)' : 'var(--border)',
                    color: isLooping ? '#0395FC' : 'var(--text-muted)',
                  }}
                >
                  <Repeat size={12} />
                  <span>{isLooping ? 'ON' : 'OFF'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* 우측: 모션 프리뷰 쇼케이스 & 코드 내보내기 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* 실시간 모션 프리뷰 박스 */}
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
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingBottom: 12,
                  borderBottom: '1px solid var(--border, rgba(255, 255, 255, 0.1))',
                }}
              >
                <h2
                  style={{
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    color: 'var(--text-main)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    margin: 0,
                  }}
                >
                  <Play size={16} style={{ color: '#0395FC', fill: '#0395FC' }} />
                  <span>실시간 UI 모션 쇼케이스</span>
                </h2>
                <button
                  type="button"
                  onClick={handleReplay}
                  className="jwt-ghost-btn"
                  style={{
                    padding: '4px 10px',
                    fontSize: '0.76rem',
                    background: 'rgba(1, 74, 255, 0.18)',
                    borderColor: 'rgba(1, 74, 255, 0.4)',
                    color: '#0395FC',
                  }}
                >
                  <RotateCcw size={12} />
                  <span>다시 재생</span>
                </button>
              </div>

              {/* 1. 슬라이드 이동 트랙 */}
              <div>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 500, display: 'block', marginBottom: 6 }}>
                  1. 슬라이드 전환 (X축 이동):
                </span>
                <div
                  style={{
                    height: 40,
                    borderRadius: 10,
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: '1px solid var(--border, rgba(255, 255, 255, 0.1))',
                    padding: 4,
                    display: 'flex',
                    alignItems: 'center',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    key={`slide-${animTrigger}`}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: 'linear-gradient(135deg, #014AFF, #0395FC)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      fontSize: 10,
                      fontWeight: 'bold',
                      animation: `slideAnim ${duration}s ${bezierCss} ${isLooping ? 'infinite alternate' : 'forwards'}`,
                    }}
                  >
                    ●
                  </div>
                </div>
              </div>

              {/* 2. 스케일 팝업 */}
              <div>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 500, display: 'block', marginBottom: 6 }}>
                  2. 스케일 바운스 & 모달 팝업:
                </span>
                <div
                  style={{
                    height: 70,
                    borderRadius: 10,
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: '1px solid var(--border, rgba(255, 255, 255, 0.1))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 10,
                  }}
                >
                  <div
                    key={`scale-${animTrigger}`}
                    style={{
                      padding: '8px 18px',
                      borderRadius: 10,
                      background: 'rgba(1, 74, 255, 0.2)',
                      border: '1px solid rgba(1, 74, 255, 0.45)',
                      color: '#0395FC',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      animation: `popAnim ${duration}s ${bezierCss} ${isLooping ? 'infinite alternate' : 'forwards'}`,
                    }}
                  >
                    모달 다이얼로그 팝업
                  </div>
                </div>
              </div>

              {/* 3. 3개 커브 동시 비교 */}
              <div>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 500, display: 'block', marginBottom: 6 }}>
                  3. 커브별 속도감 직접 비교:
                </span>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    padding: 10,
                    borderRadius: 10,
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: '1px solid var(--border, rgba(255, 255, 255, 0.1))',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.72rem' }}>
                    <span style={{ width: 56, color: '#0395FC', fontFamily: 'monospace', fontWeight: 600 }}>Custom:</span>
                    <div style={{ flex: 1, height: 10, borderRadius: 99, background: 'rgba(255, 255, 255, 0.05)', position: 'relative', overflow: 'hidden' }}>
                      <div
                        key={`cmp-custom-${animTrigger}`}
                        style={{
                          width: 20,
                          height: '100%',
                          borderRadius: 99,
                          background: '#0395FC',
                          animation: `compareAnim ${duration}s ${bezierCss} ${isLooping ? 'infinite alternate' : 'forwards'}`,
                        }}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.72rem' }}>
                    <span style={{ width: 56, color: 'var(--text-muted)', fontFamily: 'monospace' }}>Ease:</span>
                    <div style={{ flex: 1, height: 10, borderRadius: 99, background: 'rgba(255, 255, 255, 0.05)', position: 'relative', overflow: 'hidden' }}>
                      <div
                        key={`cmp-ease-${animTrigger}`}
                        style={{
                          width: 20,
                          height: '100%',
                          borderRadius: 99,
                          background: '#34d399',
                          animation: `compareAnim ${duration}s ease ${isLooping ? 'infinite alternate' : 'forwards'}`,
                        }}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.72rem' }}>
                    <span style={{ width: 56, color: 'var(--text-muted)', fontFamily: 'monospace' }}>Linear:</span>
                    <div style={{ flex: 1, height: 10, borderRadius: 99, background: 'rgba(255, 255, 255, 0.05)', position: 'relative', overflow: 'hidden' }}>
                      <div
                        key={`cmp-lin-${animTrigger}`}
                        style={{
                          width: 20,
                          height: '100%',
                          borderRadius: 99,
                          background: '#6b7280',
                          animation: `compareAnim ${duration}s linear ${isLooping ? 'infinite alternate' : 'forwards'}`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 인라인 키프레임 스타일 */}
            <style>{`
              @keyframes slideAnim {
                0% { transform: translateX(0px); }
                100% { transform: translateX(calc(100% + 400px)); }
              }
              @keyframes popAnim {
                0% { transform: scale(0.6); opacity: 0.3; }
                100% { transform: scale(1.05); opacity: 1; }
              }
              @keyframes compareAnim {
                0% { transform: translateX(0%); }
                100% { transform: translateX(calc(1000%)); }
              }
            `}</style>

            {/* 코드 추출 카드 */}
            <div
              style={{
                padding: 22,
                borderRadius: 16,
                background: 'var(--bg-card, rgba(255, 255, 255, 0.03))',
                border: '1px solid var(--border, rgba(255, 255, 255, 0.1))',
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
                  paddingBottom: 12,
                  borderBottom: '1px solid var(--border, rgba(255, 255, 255, 0.1))',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  {(['css', 'tailwind', 'framer', 'waapi'] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setCodeTab(tab)}
                      className={`jwt-preset-chip ${codeTab === tab ? 'active' : ''}`}
                      style={{ padding: '5px 10px', fontSize: '0.76rem' }}
                    >
                      {tab === 'css' && 'CSS Transition'}
                      {tab === 'tailwind' && 'Tailwind CSS'}
                      {tab === 'framer' && 'Framer Motion'}
                      {tab === 'waapi' && 'WAAPI'}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => handleCopyCode(currentCode)}
                  className="jwt-ghost-btn"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '5px 10px',
                    fontSize: '0.76rem',
                  }}
                >
                  <Copy size={13} />
                  <span>복사</span>
                </button>
              </div>

              <div
                style={{
                  padding: 14,
                  borderRadius: 10,
                  background: 'rgba(0, 0, 0, 0.5)',
                  border: '1px solid var(--border, rgba(255, 255, 255, 0.1))',
                  fontFamily: 'monospace',
                  fontSize: '0.78rem',
                  color: '#e2e8f0',
                  whiteSpace: 'pre',
                  overflowX: 'auto',
                }}
              >
                {currentCode}
              </div>
            </div>
          </div>
        </div>
      </div>

      <aside className="post-sidebar post-sidebar-right"></aside>
    </motion.div>
  );
}
