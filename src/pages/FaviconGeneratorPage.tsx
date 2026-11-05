import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  Sparkles,
  Upload,
  Download,
  Copy,
  Check,
  Package,
  Layers,
  Globe,
} from 'lucide-react';
import FloatingToolHeader from '../components/FloatingToolHeader';
import FloatingToast from '../components/FloatingToast';
import {
  ICON_DIMENSIONS,
  IconDimension,
  createZipBundle,
  createIcoFromPngs,
  generateHtmlSnippet,
  generateWebManifestJson,
} from '../utils/favicon';

interface FaviconGeneratorPageProps {
  onNavigate: (path: string) => void;
}

interface RenderedIconData {
  dimension: IconDimension;
  dataUrl: string;
  bytes: Uint8Array;
}

export default function FaviconGeneratorPage({ onNavigate }: FaviconGeneratorPageProps) {
  // 소스 이미지 URL (기본 프리셋 로드)
  const [sourceImageUrl, setSourceImageUrl] = useState<string>('');
  // 앱/웹사이트 이름 (프리셋 선택 전 비어있음)
  const [appName, setAppName] = useState<string>('');
  // 생성된 각 규격별 이미지 데이터
  const [renderedIcons, setRenderedIcons] = useState<RenderedIconData[]>([]);
  // 로딩 상태
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  // 토스트 메시지
  const [copyToast, setCopyToast] = useState<string | null>(null);

  // 숨김 캔버스 참조
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // 프리셋 아이콘 생성 함수 (Canvas 기반으로 고해상도 512x512 이미지 생성)
  const generatePresetDataUrl = useCallback((presetType: 'code' | 'star' | 'diamond' | 'circle'): string => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // 배경 둥근 사각형 그라디언트
    const r = 110;
    const grad = ctx.createLinearGradient(0, 0, 512, 512);

    if (presetType === 'code') {
      grad.addColorStop(0, '#014AFF');
      grad.addColorStop(1, '#0395FC');
    } else if (presetType === 'star') {
      grad.addColorStop(0, '#0284c7');
      grad.addColorStop(1, '#38bdf8');
    } else if (presetType === 'diamond') {
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(1, '#014AFF');
    } else {
      grad.addColorStop(0, '#059669');
      grad.addColorStop(1, '#06b6d4');
    }

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(0, 0, 512, 512, r);
    ctx.fill();

    // 심볼 그리기
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 220px sans-serif';

    if (presetType === 'code') {
      ctx.fillText('</>', 256, 260);
    } else if (presetType === 'star') {
      ctx.fillText('★', 256, 260);
    } else if (presetType === 'diamond') {
      ctx.fillText('◆', 256, 260);
    } else {
      ctx.fillText('●', 256, 260);
    }

    return canvas.toDataURL('image/png');
  }, []);

  // 초기에는 이미지가 비어있으며, 프리셋 선택 또는 파일 업로드 시 로드됩니다.

  // 소스 이미지로부터 규격별 아이콘 렌더링
  const processImageToIcons = useCallback((imgSrc: string) => {
    if (!imgSrc) return;
    setIsProcessing(true);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const results: RenderedIconData[] = [];

        ICON_DIMENSIONS.forEach((dim) => {
          const cvs = document.createElement('canvas');
          cvs.width = dim.size;
          cvs.height = dim.size;
          const ctx = cvs.getContext('2d');

          if (ctx) {
            // 고품질 이미지 스케일링 설정
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, dim.size, dim.size);

            const dataUrl = cvs.toDataURL('image/png');
            // Base64 문자열을 바이너리 Uint8Array로 변환
            const base64Data = dataUrl.split(',')[1];
            const binaryStr = atob(base64Data);
            const bytes = new Uint8Array(binaryStr.length);
            for (let i = 0; i < binaryStr.length; i++) {
              bytes[i] = binaryStr.charCodeAt(i);
            }

            results.push({
              dimension: dim,
              dataUrl,
              bytes,
            });
          }
        });

        setRenderedIcons(results);
      } catch (err) {
        console.error('아이콘 렌더링 중 오류:', err);
      } finally {
        setIsProcessing(false);
      }
    };
    img.src = imgSrc;
  }, []);

  // 소스 이미지 변경 시 재생성
  useEffect(() => {
    if (sourceImageUrl) {
      processImageToIcons(sourceImageUrl);
    } else {
      setRenderedIcons([]);
    }
  }, [sourceImageUrl, processImageToIcons]);

  // 프리셋 선택 핸들러
  const handleSelectPreset = (preset: 'code' | 'star' | 'diamond' | 'circle') => {
    setSourceImageUrl(generatePresetDataUrl(preset));
    if (!appName) {
      setAppName('Xitora Web App');
    }
  };

  // 초기화 핸들러
  const handleClear = () => {
    setSourceImageUrl('');
    setAppName('');
    setRenderedIcons([]);
  };

  // 파일 업로드 핸들러
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        setSourceImageUrl(event.target.result);
        if (!appName) setAppName('My Web App');
      }
    };
    reader.readAsDataURL(file);
  };

  // 단일 PNG 다운로드
  const handleDownloadSinglePng = (icon: RenderedIconData) => {
    const link = document.createElement('a');
    link.href = icon.dataUrl;
    link.download = icon.dimension.filename;
    link.click();
  };

  // ICO 파일 다운로드 (16, 32, 48px 결합)
  const handleDownloadIco = () => {
    try {
      const icoPngs = renderedIcons
        .filter((i) => [16, 32, 48].includes(i.dimension.size))
        .map((i) => ({
          width: i.dimension.size,
          height: i.dimension.size,
          data: i.bytes,
        }));

      if (icoPngs.length === 0) return;

      const icoBytes = createIcoFromPngs(icoPngs);
      const blob = new Blob([icoBytes.buffer as ArrayBuffer], { type: 'image/x-icon' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'favicon.ico';
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('ICO 생성 실패:', err);
    }
  };

  // 전체 규격 ZIP 번들 다운로드
  const handleDownloadZipBundle = () => {
    try {
      if (renderedIcons.length === 0) return;

      // 1. ICO 생성
      const icoPngs = renderedIcons
        .filter((i) => [16, 32, 48].includes(i.dimension.size))
        .map((i) => ({
          width: i.dimension.size,
          height: i.dimension.size,
          data: i.bytes,
        }));
      const icoBytes = createIcoFromPngs(icoPngs);

      // 2. ZIP 파일 목록 구성
      const zipFiles = [
        { name: 'favicon.ico', data: icoBytes },
        ...renderedIcons.map((i) => ({
          name: i.dimension.filename,
          data: i.bytes,
        })),
        { name: 'site.webmanifest', data: generateWebManifestJson(appName || 'My Web App') },
      ];

      const zipBytes = createZipBundle(zipFiles);
      const blob = new Blob([zipBytes.buffer as ArrayBuffer], { type: 'application/zip' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `favicon-bundle-${Date.now()}.zip`;
      link.click();
      URL.revokeObjectURL(url);

      setCopyToast('전체 규격 ZIP 번들이 다운로드되었습니다.');
      setTimeout(() => setCopyToast(null), 2500);
    } catch (err) {
      console.error('ZIP 번들 생성 오류:', err);
    }
  };

  // HTML 메타 태그 복사
  const handleCopyHtmlSnippet = async () => {
    try {
      const snippet = generateHtmlSnippet(appName || 'My Web App');
      await navigator.clipboard.writeText(snippet);
      setCopyToast('HTML <head> 태그 코드가 복사되었습니다.');
      setTimeout(() => setCopyToast(null), 2000);
    } catch {
      setCopyToast('복사 권한이 없어 실패했습니다.');
      setTimeout(() => setCopyToast(null), 2000);
    }
  };

  // 16px 및 180px 미리보기 찾기
  const fav16 = renderedIcons.find((i) => i.dimension.size === 16)?.dataUrl;
  const apple180 = renderedIcons.find((i) => i.dimension.size === 180)?.dataUrl;

  // 플로팅 헤더 미니 위젯 내용
  const miniWidgetContent = useMemo(() => {
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
        <span style={{ color: '#0395FC', fontWeight: 700 }}>{renderedIcons.length}개 규격 생성</span>
        <span style={{ color: 'var(--border)' }}>|</span>
        <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>ICO & ZIP 지원</span>
      </div>
    );
  }, [renderedIcons.length]);

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
        toolName="Favicon & 앱 아이콘 생성기"
        categoryName="도구"
        categoryPath="/tools"
        onNavigate={onNavigate}
        miniWidgetContent={miniWidgetContent}
      />
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* 2. 복사/다운로드 알림 토스트 (createPortal 기반 완벽한 CLS 0 방어) */}
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
              <Layers size={24} stroke="url(#toolIconGradient)" />
            </div>
            <div>
              <h1 style={{ fontSize: "1.75rem", fontWeight: 700, margin: 0, letterSpacing: "-0.03em" }}>
                Favicon & 앱 아이콘 생성기
              </h1>
              <p style={{ fontSize: "0.92rem", color: "#888", margin: 0, marginTop: 4 }}>
                단일 고해상도 이미지를 기반으로 웹용 파비콘(ICO/PNG) 및 모바일 규격별 번들 ZIP 생성
              </p>
            </div>
          </div>

          {/* 전체 ZIP 번들 다운로드 버튼 */}
          <button
            type="button"
            onClick={handleDownloadZipBundle}
            disabled={renderedIcons.length === 0}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: renderedIcons.length > 0 ? 'rgba(1, 74, 255, 0.22)' : 'rgba(255,255,255,0.04)',
              border: renderedIcons.length > 0 ? '1px solid rgba(1, 74, 255, 0.45)' : '1px solid var(--border)',
              color: renderedIcons.length > 0 ? '#0395FC' : 'var(--text-muted)',
              fontWeight: 600,
              fontSize: '0.84rem',
              padding: '8px 16px',
              borderRadius: 10,
              cursor: renderedIcons.length > 0 ? 'pointer' : 'not-allowed',
              transition: 'all 0.15s',
            }}
          >
            <Package size={16} />
            <span>전체 ZIP 번들 다운로드</span>
          </button>
        </div>

        {/* 프리셋 바 */}
        <div className="jwt-presets-bar" style={{ marginBottom: 24 }}>
          <span className="jwt-presets-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Sparkles size={14} style={{ color: '#0395FC' }} />
            샘플 프리셋:
          </span>
          <div className="jwt-presets-list">
            {(['code', 'star', 'diamond', 'circle'] as const).map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => handleSelectPreset(preset)}
                className="jwt-preset-chip"
              >
                <span>
                  {preset === 'code' && '개발자 </>'}
                  {preset === 'star' && '스타 ★'}
                  {preset === 'diamond' && '다이아 ◆'}
                  {preset === 'circle' && '서클 ●'}
                </span>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="jwt-preset-chip jwt-chip-clear"
            style={{ marginLeft: 'auto' }}
            title="초기화"
          >
            <span>비우기</span>
          </button>
        </div>

        {/* 상단 2열 구성: 업로드 & 실시간 미리보기 시뮬레이터 */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 20,
            marginBottom: 24,
          }}
        >
          {/* 좌측: 업로드 & 앱 설정 카드 */}
          <div
            style={{
              padding: 22,
              borderRadius: 16,
              background: 'var(--bg-card, rgba(255, 255, 255, 0.03))',
              border: '1px solid var(--border, rgba(255, 255, 255, 0.1))',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: 16,
            }}
          >
            <div>
              <span
                style={{
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: 'var(--text-main)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 10,
                }}
              >
                <Upload size={16} style={{ color: '#0395FC' }} />
                <span>이미지 파일 업로드 (PNG, SVG, JPG, WebP)</span>
              </span>
              <label
                style={{
                  border: '2px dashed var(--border, rgba(255, 255, 255, 0.15))',
                  borderRadius: 12,
                  padding: 24,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  background: 'rgba(0, 0, 0, 0.2)',
                  transition: 'border-color 0.2s',
                }}
              >
                <Upload size={28} style={{ color: 'var(--text-muted)', marginBottom: 8 }} />
                <span style={{ fontSize: '0.82rem', color: 'var(--text-main)', fontWeight: 600 }}>
                  클릭하거나 이미지를 선택하여 업로드
                </span>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  권장 규격: 512x512 이상의 정사각형 이미지
                </span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
              </label>
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.78rem',
                  color: 'var(--text-muted)',
                  fontWeight: 600,
                  marginBottom: 6,
                }}
              >
                웹앱/사이트 이름 (Manifest 및 탭 제목용)
              </label>
              <input
                type="text"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                placeholder="My Web App"
                style={{
                  width: '100%',
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid var(--border, rgba(255, 255, 255, 0.1))',
                  borderRadius: 8,
                  padding: '8px 12px',
                  fontSize: '0.85rem',
                  color: 'var(--text-main)',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          {/* 우측: 실제 브라우저 탭 및 기기 실시간 모의 뷰어 */}
          <div
            style={{
              padding: 22,
              borderRadius: 16,
              background: 'var(--bg-card, rgba(255, 255, 255, 0.03))',
              border: '1px solid var(--border, rgba(255, 255, 255, 0.1))',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: 16,
            }}
          >
            <div>
              <h2
                style={{
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  color: 'var(--text-main)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  paddingBottom: 12,
                  borderBottom: '1px solid var(--border, rgba(255, 255, 255, 0.1))',
                  margin: 0,
                }}
              >
                <Globe size={16} style={{ color: '#0395FC' }} />
                <span>실제 환경 시뮬레이션 미리보기</span>
              </h2>

              {/* 1. 브라우저 탭 모의 프리뷰 */}
              <div style={{ marginTop: 14 }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                  데스크톱 웹 브라우저 탭 바:
                </span>
                <div
                  style={{
                    borderRadius: 10,
                    border: '1px solid var(--border, rgba(255, 255, 255, 0.1))',
                    background: '#1a1d24',
                    padding: 8,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      background: '#282c34',
                      padding: '6px 12px',
                      borderRadius: 8,
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                      maxWidth: 240,
                    }}
                  >
                    {fav16 ? (
                      <img src={fav16} alt="tab icon" style={{ width: 16, height: 16, borderRadius: 2 }} />
                    ) : (
                      <div style={{ width: 16, height: 16, background: '#4b5563', borderRadius: 2 }} />
                    )}
                    <span
                      style={{
                        fontSize: '0.78rem',
                        color: 'var(--text-main)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontWeight: 500,
                      }}
                    >
                      {appName || 'My Web App'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. 모바일 홈 화면 모의 프리뷰 */}
              <div style={{ marginTop: 14 }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                  스마트폰 홈 화면 아이콘:
                </span>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    padding: 12,
                    borderRadius: 10,
                    border: '1px solid var(--border, rgba(255, 255, 255, 0.1))',
                    background: 'rgba(0, 0, 0, 0.3)',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    {apple180 ? (
                      <img
                        src={apple180}
                        alt="app icon"
                        style={{
                          width: 52,
                          height: 52,
                          borderRadius: 12,
                          boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                          border: '1px solid rgba(255,255,255,0.1)',
                        }}
                      />
                    ) : (
                      <div style={{ width: 52, height: 52, background: '#374151', borderRadius: 12 }} />
                    )}
                    <span
                      style={{
                        fontSize: '0.72rem',
                        color: 'var(--text-muted)',
                        fontWeight: 500,
                        maxWidth: 64,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        textAlign: 'center',
                      }}
                    >
                      {appName || 'My Web App'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    <p style={{ color: 'var(--text-main)', fontWeight: 600, margin: '0 0 2px' }}>
                      iOS Apple Touch & Android PWA
                    </p>
                    <p style={{ margin: 0 }}>
                      고해상도 레티나 디스플레이 및 스플래시 화면에 최적화된 규격이 자동 적용됩니다.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 빠른 액션: ICO 다운로드 & HTML 메타태그 복사 */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: 10,
                paddingTop: 12,
                borderTop: '1px solid var(--border, rgba(255, 255, 255, 0.1))',
              }}
            >
              <button
                type="button"
                onClick={handleDownloadIco}
                className="jwt-ghost-btn"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <Download size={14} />
                <span>favicon.ico 단독 다운로드</span>
              </button>
              <button
                type="button"
                onClick={handleCopyHtmlSnippet}
                className="jwt-ghost-btn"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <Copy size={14} />
                <span>HTML &lt;head&gt; 태그 복사</span>
              </button>
            </div>
          </div>
        </div>

        {/* 규격별 개별 아이콘 그리드 */}
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
            }}
          >
            <h2
              style={{
                fontSize: '0.92rem',
                fontWeight: 600,
                color: 'var(--text-main)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                margin: 0,
              }}
            >
              <Layers size={16} style={{ color: '#0395FC' }} />
              <span>규격별 생성 아이콘 목록</span>
            </h2>
            <span
              style={{
                fontSize: '0.76rem',
                padding: '3px 8px',
                borderRadius: 6,
                background: 'rgba(1, 74, 255, 0.16)',
                color: '#0395FC',
                fontFamily: 'monospace',
                fontWeight: 600,
              }}
            >
              총 {renderedIcons.length}개 규격
            </span>
          </div>

          {renderedIcons.length === 0 ? (
            <div
              style={{
                padding: '40px 16px',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: '0.85rem',
                border: '1px dashed var(--border, rgba(255, 255, 255, 0.1))',
                borderRadius: 12,
              }}
            >
              생성된 아이콘이 없습니다. 상단에서 이미지를 업로드하거나 샘플 프리셋을 선택하세요.
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                gap: 12,
              }}
            >
              {renderedIcons.map((icon) => (
              <div
                key={icon.dimension.id}
                style={{
                  borderRadius: 12,
                  border: '1px solid var(--border, rgba(255, 255, 255, 0.08))',
                  background: 'rgba(0, 0, 0, 0.25)',
                  padding: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                }}
              >
                <div
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.72rem',
                    color: 'var(--text-muted)',
                  }}
                >
                  <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                    {icon.dimension.size}x{icon.dimension.size}
                  </span>
                  <span style={{ fontSize: '0.68rem' }}>{icon.dimension.name}</span>
                </div>

                <div
                  style={{
                    width: 72,
                    height: 72,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 4,
                    borderRadius: 8,
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                  }}
                >
                  <img
                    src={icon.dataUrl}
                    alt={icon.dimension.filename}
                    style={{
                      width: Math.min(icon.dimension.size, 58),
                      height: Math.min(icon.dimension.size, 58),
                      objectFit: 'contain',
                      borderRadius: 4,
                    }}
                  />
                </div>

                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span
                    style={{
                      fontSize: '0.68rem',
                      color: 'var(--text-muted)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      textAlign: 'center',
                    }}
                    title={icon.dimension.filename}
                  >
                    {icon.dimension.filename}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDownloadSinglePng(icon)}
                    className="jwt-ghost-btn"
                    style={{
                      width: '100%',
                      padding: '4px 8px',
                      fontSize: '0.72rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                    }}
                  >
                    <Download size={12} />
                    <span>PNG 저장</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      </div>

      <aside className="post-sidebar post-sidebar-right"></aside>
    </motion.div>
  );
}
