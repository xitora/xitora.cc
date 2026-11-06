import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Image as ImageIcon,
  ChevronLeft,
  Sliders,
  Download,
  Upload,
  Trash2,
  RefreshCw,
  Sparkles,
  Link2,
  Unlink,
  Check,
  FileImage,
  Layers,
  ArrowRight,
  ZoomIn,
} from 'lucide-react';
import FloatingToolHeader from '../components/FloatingToolHeader';
import {
  formatBytes,
  calculateAspectRatioFit,
  optimizeImage,
  CompressionOptions,
  ImageOptimizationResult,
} from '../utils/imageOptimizer';

type Navigate = (path: string) => void;

interface ImageOptimizerPageProps {
  onNavigate: Navigate;
}

export interface FileOptions {
  targetFormat: 'image/webp' | 'image/jpeg' | 'image/png';
  quality: number;
  scalePreset: number;
  customWidth: number;
  customHeight: number;
  maintainAspectRatio: boolean;
}

const DEFAULT_OPTIONS: FileOptions = {
  targetFormat: 'image/webp',
  quality: 0.8,
  scalePreset: 1.0,
  customWidth: 1920,
  customHeight: 1080,
  maintainAspectRatio: true,
};

interface ImageItem {
  id: string;
  file: File;
  name: string;
  originalSize: number;
  previewUrl: string;
  options: FileOptions;
  result: ImageOptimizationResult | null;
  isProcessing: boolean;
  error?: string;
}

export default function ImageOptimizerPage({ onNavigate }: ImageOptimizerPageProps) {
  // 현재 선택된 파일의 편집 옵션 상태 (UI 폼 연동)
  const [targetFormat, setTargetFormat] = useState<'image/webp' | 'image/jpeg' | 'image/png'>('image/webp');
  const [quality, setQuality] = useState<number>(0.8); // 80%
  const [scalePreset, setScalePreset] = useState<number>(1.0); // 1.0, 0.75, 0.5, 0.25, -1 (custom)
  const [customWidth, setCustomWidth] = useState<number>(1920);
  const [customHeight, setCustomHeight] = useState<number>(1080);
  const [maintainAspectRatio, setMaintainAspectRatio] = useState<boolean>(true);

  // 업로드된 이미지 파일 목록
  const [images, setImages] = useState<ImageItem[]>([]);
  const previewUrlsRef = useRef(new Set<string>());
  useEffect(() => {
    const current = new Set(images.map(image => image.previewUrl));
    previewUrlsRef.current.forEach(url => { if (!current.has(url)) URL.revokeObjectURL(url); });
    previewUrlsRef.current = current;
  }, [images]);
  useEffect(() => () => previewUrlsRef.current.forEach(url => URL.revokeObjectURL(url)), []);

  // 현재 비교 뷰어 및 편집에 선택된 이미지 ID
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);

  // 비교 뷰어 슬라이더 위치 (0 ~ 100%)
  const [compareSliderPos, setCompareSliderPos] = useState<number>(50);
  const [isDraggingSlider, setIsDraggingSlider] = useState<boolean>(false);
  const compareContainerRef = useRef<HTMLDivElement | null>(null);

  // 드래그 앤 드롭 상태
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // 선택된 활성 이미지
  const activeImage = useMemo(() => {
    if (!selectedImageId) return images[0] || null;
    return images.find((img) => img.id === selectedImageId) || images[0] || null;
  }, [images, selectedImageId]);

  // 단일 이미지 압축 처리 함수
  const processSingleImage = useCallback(
    async (item: ImageItem, customOpts?: CompressionOptions): Promise<ImageOptimizationResult | null> => {
      try {
        const fileOpts: CompressionOptions = customOpts || {
          format: item.options.targetFormat,
          quality: item.options.quality,
          maxWidth: item.options.scalePreset === -1 ? item.options.customWidth : undefined,
          maxHeight: item.options.scalePreset === -1 ? item.options.customHeight : undefined,
          maintainAspectRatio: item.options.maintainAspectRatio,
        };

        let optionsToApply = { ...fileOpts };
        if (item.options.scalePreset > 0 && item.options.scalePreset < 1) {
          // 배율 적용
          const img = new Image();
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error('이미지를 불러오지 못했습니다.'));
            img.src = item.previewUrl;
          });
          optionsToApply.maxWidth = Math.round(img.naturalWidth * item.options.scalePreset);
          optionsToApply.maxHeight = Math.round(img.naturalHeight * item.options.scalePreset);
        }
        return await optimizeImage(item.file, optionsToApply);
      } catch (err) {
        console.error('Image compression error:', err);
        return null;
      }
    },
    []
  );

  // 파일 목록 추가 및 자동 압축 실행 (다중 파일 지원)
  const handleAddFiles = useCallback(
    async (newFiles: File[]) => {
      const validFiles = newFiles.filter((f) => f.type.startsWith('image/'));
      if (validFiles.length === 0) return;

      const currentBaseOptions: FileOptions = {
        targetFormat,
        quality,
        scalePreset,
        customWidth,
        customHeight,
        maintainAspectRatio,
      };

      const newItems: ImageItem[] = validFiles.map((f) => ({
        id: 'img_' + Math.random().toString(36).substring(2, 9),
        file: f,
        name: f.name,
        originalSize: f.size,
        previewUrl: URL.createObjectURL(f),
        options: { ...currentBaseOptions },
        result: null,
        isProcessing: true,
      }));

      setImages((prev) => [...prev, ...newItems]);
      if (!selectedImageId && newItems.length > 0) {
        setSelectedImageId(newItems[0].id);
      }

      // 비동기 압축 처리
      for (const item of newItems) {
        const res = await processSingleImage(item);
        setImages((prev) =>
          prev.map((it) => (it.id === item.id && it.options === item.options ? { ...it, result: res, isProcessing: false } : it))
        );
      }
    },
    [targetFormat, quality, scalePreset, customWidth, customHeight, maintainAspectRatio, processSingleImage, selectedImageId]
  );

  // 활성 이미지 선택 전환 시 상단 옵션 폼 동기화
  useEffect(() => {
    if (!activeImage) return;
    setTargetFormat(activeImage.options.targetFormat);
    setQuality(activeImage.options.quality);
    setScalePreset(activeImage.options.scalePreset);
    setCustomWidth(activeImage.options.customWidth);
    setCustomHeight(activeImage.options.customHeight);
    setMaintainAspectRatio(activeImage.options.maintainAspectRatio);
  }, [activeImage?.id]);

  // 옵션 변경 디바운스 - 현재 활성 선택 이미지에 개별 적용 및 재압축
  useEffect(() => {
    if (!activeImage) return;

    const hasDiff =
      activeImage.options.targetFormat !== targetFormat ||
      activeImage.options.quality !== quality ||
      activeImage.options.scalePreset !== scalePreset ||
      activeImage.options.customWidth !== customWidth ||
      activeImage.options.customHeight !== customHeight ||
      activeImage.options.maintainAspectRatio !== maintainAspectRatio;

    if (!hasDiff) return;

    const updatedOptions: FileOptions = {
      targetFormat,
      quality,
      scalePreset,
      customWidth,
      customHeight,
      maintainAspectRatio,
    };

    const timer = setTimeout(async () => {
      setImages((prev) =>
        prev.map((it) => (it.id === activeImage.id ? { ...it, options: updatedOptions, isProcessing: true } : it))
      );

      const res = await processSingleImage({ ...activeImage, options: updatedOptions });
      setImages((prev) =>
        prev.map((it) => (it.id === activeImage.id && it.options === updatedOptions ? { ...it, result: res, isProcessing: false } : it))
      );
    }, 350);

    return () => clearTimeout(timer);
  }, [targetFormat, quality, scalePreset, customWidth, customHeight, maintainAspectRatio, activeImage?.id, processSingleImage]);

  // 현재 활성 파일의 설정을 대기열의 모든 이미지에 일괄 적용
  const handleApplyOptionsToAll = async () => {
    if (images.length <= 1) return;
    const currentOpts: FileOptions = {
      targetFormat,
      quality,
      scalePreset,
      customWidth,
      customHeight,
      maintainAspectRatio,
    };

    setImages((prev) =>
      prev.map((it) => ({ ...it, options: currentOpts, isProcessing: true }))
    );

    for (const item of images) {
      const res = await processSingleImage({ ...item, options: currentOpts });
      setImages((prev) =>
        prev.map((it) => (it.id === item.id && it.options === currentOpts ? { ...it, result: res, isProcessing: false } : it))
      );
    }
  };

  // 클립보드 붙여넣기(Ctrl+V) 이벤트 리스너
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!e.clipboardData) return;
      const files: File[] = [];
      for (let i = 0; i < e.clipboardData.items.length; i++) {
        const item = e.clipboardData.items[i];
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      }
      if (files.length > 0) {
        handleAddFiles(files);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [handleAddFiles]);

  // 비교 슬라이더 마우스 드래그 인터랙션
  const handleSliderMove = useCallback((clientX: number) => {
    if (!compareContainerRef.current) return;
    const rect = compareContainerRef.current.getBoundingClientRect();
    const offsetX = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (offsetX / rect.width) * 100));
    setCompareSliderPos(percentage);
  }, []);

  const handleMouseDownSlider = () => {
    setIsDraggingSlider(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingSlider) handleSliderMove(e.clientX);
    };
    const handleMouseUp = () => {
      setIsDraggingSlider(false);
    };

    if (isDraggingSlider) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingSlider, handleSliderMove]);

  // 샘플 데모 이미지 생성 (빠른 테스트용)
  const handleLoadSampleImage = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 800;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 그라데이션 및 네온 패턴 렌더링
    const grad = ctx.createLinearGradient(0, 0, 1200, 800);
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(0.5, '#1e1b4b');
    grad.addColorStop(1, '#020617');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1200, 800);

    // 기하학적 발광 원형 패턴
    for (let i = 0; i < 25; i++) {
      ctx.beginPath();
      ctx.arc(
        Math.random() * 1200,
        Math.random() * 800,
        Math.random() * 160 + 20,
        0,
        Math.PI * 2
      );
      ctx.fillStyle = `hsla(${Math.random() * 360}, 80%, 65%, ${Math.random() * 0.4 + 0.1})`;
      ctx.fill();
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 56px "Outfit", "Pretendard", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Sample Test Image', 600, 400);

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], 'sample_demo_image.png', { type: 'image/png' });
        handleAddFiles([file]);
      }
    }, 'image/png');
  };

  // 단일 파일 다운로드
  const handleDownloadSingle = (item: ImageItem) => {
    if (!item.result) return;
    const ext = item.result.format === 'image/webp' ? 'webp' : item.result.format === 'image/jpeg' ? 'jpg' : 'png';
    const baseName = item.name.substring(0, item.name.lastIndexOf('.')) || item.name;
    const a = document.createElement('a');
    a.href = item.result.dataUrl;
    a.download = `${baseName}_optimized.${ext}`;
    a.click();
  };

  // 전체 파일 일괄 다운로드
  const handleDownloadAll = () => {
    images.forEach((item, idx) => {
      if (item.result) {
        setTimeout(() => {
          handleDownloadSingle(item);
        }, idx * 200);
      }
    });
  };

  // 전체 이미지 목록 삭제
  const handleClearAll = () => {
    setImages([]);
    setSelectedImageId(null);
  };

  // 총 절감 바이트 및 퍼센트 계산
  const totalStats = useMemo(() => {
    let originalTotal = 0;
    let compressedTotal = 0;

    images.forEach((img) => {
      if (img.result) {
        originalTotal += img.originalSize;
        compressedTotal += img.result.compressedSize;
      }
    });

    const savedBytes = Math.max(0, originalTotal - compressedTotal);
    const savedPercent = originalTotal > 0 ? (savedBytes / originalTotal) * 100 : 0;

    return {
      originalTotal,
      compressedTotal,
      savedBytes,
      savedPercent,
    };
  }, [images]);

  // 상단 플로팅 알약 미니 위젯 렌더러
  const miniWidgetContent = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'nowrap' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <FileImage size={15} style={{ color: '#0395FC' }} />
        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap' }}>
          {images.length > 0 ? `${images.length}개 파일` : '대기 중'}
        </span>
      </div>

      {totalStats.savedBytes > 0 && (
        <span
          style={{
            fontSize: '0.76rem',
            color: '#10b981',
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            borderRadius: '999px',
            padding: '2px 8px',
            whiteSpace: 'nowrap',
            fontWeight: 600,
          }}
        >
          -{totalStats.savedPercent.toFixed(0)}% ({formatBytes(totalStats.savedBytes)})
        </span>
      )}

      {images.length > 0 && (
        <button
          type="button"
          onClick={handleDownloadAll}
          style={{
            background: 'rgba(1, 74, 255, 0.2)',
            border: '1px solid rgba(1, 74, 255, 0.45)',
            color: '#0395FC',
            borderRadius: '999px',
            padding: '4px 12px',
            fontSize: '0.78rem',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
          title="변환된 모든 이미지 다운로드"
        >
          <Download size={13} /> 일괄 다운로드
        </button>
      )}
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
      {/* 1. 최상단 플로팅 알약 헤더 */}
      <FloatingToolHeader
        toolName="이미지 최적화 도구"
        categoryName="도구"
        categoryPath="/tools"
        onNavigate={onNavigate}
        miniWidgetContent={miniWidgetContent}
      />

      <aside className="post-sidebar post-sidebar-left"></aside>

      <div className="post-detail-container" style={{ maxWidth: '1100px', width: '100%', paddingBottom: '120px' }}>
        {/* 숨김 다중 파일 인풋 (초기 및 추가 업로드 공통 마운트) */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              handleAddFiles(Array.from(e.target.files));
              e.target.value = '';
            }
          }}
          multiple
          accept="image/*"
          style={{ display: 'none' }}
        />

        {/* 서브 내비게이션 */}
        <div style={{ marginBottom: '20px' }}>
          <button
            type="button"
            onClick={() => onNavigate('/tools')}
            className="back-btn"
            aria-label="도구 목록으로 돌아가기"
          >
            <ChevronLeft size={18} />
            <span>목록으로</span>
          </button>
        </div>

        {/* SVG 그라데이션 정의 (좌상단 #014AFF > 우하단 #0395FC) */}
        <svg width="0" height="0" style={{ position: "absolute", pointerEvents: "none" }}>
          <linearGradient id="toolIconGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#014AFF" />
            <stop offset="100%" stopColor="#0395FC" />
          </linearGradient>
        </svg>

        {/* 3. 헤더 타이틀 */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: 'linear-gradient(135deg, rgba(1, 74, 255, 0.14) 0%, rgba(3, 149, 252, 0.14) 100%)',
                border: '1px solid rgba(1, 74, 255, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ImageIcon size={24} stroke="url(#toolIconGradient)" />
            </div>
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0, letterSpacing: '-0.03em' }}>
                이미지 최적화 도구
              </h1>
              <p style={{ fontSize: '0.92rem', color: '#888', margin: 0, marginTop: 4 }}>
                서버 업로드 없이 브라우저 로컬에서 안전하게 이미지를 압축하고 포맷을 변환합니다
              </p>
            </div>
          </div>
        </div>

        {/* 2. 세부 옵션 바 */}
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            padding: '16px 20px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
          }}
        >
          {/* 활성 선택 파일 안내 뱃지 */}
          {activeImage && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>현재 편집 대상:</span>
              <strong style={{ fontSize: '0.86rem', color: '#0395FC', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '300px' }}>
                {activeImage.name}
              </strong>
              {images.length > 1 && (
                <button
                  type="button"
                  onClick={handleApplyOptionsToAll}
                  style={{
                    marginLeft: 'auto',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    background: 'rgba(1, 74, 255, 0.15)',
                    border: '1px solid rgba(1, 74, 255, 0.35)',
                    color: '#0395FC',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                  title="현재 설정값을 대기열의 모든 이미지에 일괄 적용합니다"
                >
                  <Sparkles size={12} /> 모든 파일에 적용
                </button>
              )}
            </div>
          )}

          {/* 포맷 선택 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>출력 포맷:</span>
            <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', padding: '3px', borderRadius: '8px', gap: '4px' }}>
              {(['image/webp', 'image/jpeg', 'image/png'] as const).map((fmt) => {
                const label = fmt === 'image/webp' ? 'WebP' : fmt === 'image/jpeg' ? 'JPEG' : 'PNG';
                const isSelected = targetFormat === fmt;
                return (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => setTargetFormat(fmt)}
                    style={{
                      padding: '4px 12px',
                      borderRadius: '6px',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      background: isSelected ? 'rgba(1, 74, 255, 0.25)' : 'transparent',
                      color: isSelected ? '#0395FC' : 'var(--text-muted)',
                      border: isSelected ? '1px solid rgba(1, 74, 255, 0.4)' : '1px solid transparent',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 압축 품질 슬라이더 (PNG 제외) */}
          {targetFormat !== 'image/png' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>품질:</span>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={quality}
                onChange={(e) => setQuality(parseFloat(e.target.value))}
                style={{ width: '110px', accentColor: '#0395FC', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '0.82rem', fontFamily: 'var(--font-mono)', minWidth: '38px', color: '#0395FC', fontWeight: 600 }}>
                {Math.round(quality * 100)}%
              </span>
            </div>
          )}

          {/* 리사이즈 배율 프리셋 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>크기 배율:</span>
            <select
              value={scalePreset}
              onChange={(e) => setScalePreset(parseFloat(e.target.value))}
              style={{
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                color: 'var(--text-main)',
                padding: '4px 8px',
                fontSize: '0.82rem',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value={1.0}>100% (원본 크기)</option>
              <option value={0.75}>75%</option>
              <option value={0.5}>50%</option>
              <option value={0.25}>25%</option>
              <option value={-1}>커스텀 해상도 지정</option>
            </select>
          </div>

          {/* 커스텀 해상도 입력 */}
          {scalePreset === -1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input
                type="number"
                value={customWidth}
                onChange={(e) => setCustomWidth(Math.max(1, parseInt(e.target.value) || 1))}
                style={{
                  width: '64px',
                  padding: '4px 6px',
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  color: 'var(--text-main)',
                  fontSize: '0.8rem',
                  textAlign: 'center',
                }}
              />
              <span style={{ color: 'var(--text-muted)' }}>×</span>
              <input
                type="number"
                value={customHeight}
                onChange={(e) => setCustomHeight(Math.max(1, parseInt(e.target.value) || 1))}
                style={{
                  width: '64px',
                  padding: '4px 6px',
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  color: 'var(--text-main)',
                  fontSize: '0.8rem',
                  textAlign: 'center',
                }}
              />
              <button
                type="button"
                onClick={() => setMaintainAspectRatio(!maintainAspectRatio)}
                style={{
                  background: maintainAspectRatio ? 'rgba(1, 74, 255, 0.15)' : 'none',
                  border: maintainAspectRatio ? '1px solid rgba(1, 74, 255, 0.3)' : '1px solid var(--border)',
                  color: maintainAspectRatio ? '#0395FC' : 'var(--text-muted)',
                  borderRadius: '6px',
                  padding: '4px 6px',
                  cursor: 'pointer',
                }}
                title={maintainAspectRatio ? '비율 고정 활성' : '비율 고정 해제'}
              >
                {maintainAspectRatio ? <Link2 size={14} /> : <Unlink size={14} />}
              </button>
            </div>
          )}
        </div>

        {/* 3. 드래그 앤 드롭 업로드 카드 (비어있거나 추가할 때) */}
        {images.length === 0 ? (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragOver(false);
              if (e.dataTransfer.files) {
                handleAddFiles(Array.from(e.dataTransfer.files));
              }
            }}
            style={{
              background: isDragOver ? 'rgba(1, 74, 255, 0.08)' : 'var(--bg-card)',
              border: isDragOver ? '2px dashed #0395FC' : '2px dashed var(--border)',
              borderRadius: '24px',
              padding: '60px 24px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '16px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(1, 74, 255, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#0395FC',
              }}
            >
              <Upload size={30} />
            </div>
            <div>
              <div style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
                최적화할 이미지를 드래그하여 놓거나 클릭하여 선택
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                PNG, JPEG, WebP, GIF 지원 · 클립보드 이미지 붙여넣기(Ctrl+V) 가능
              </div>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleLoadSampleImage();
              }}
              style={{
                marginTop: '8px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid var(--border)',
                color: 'var(--text-main)',
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              <Sparkles size={14} style={{ color: '#0395FC' }} /> 샘플 이미지로 바로 테스트
            </button>
          </div>
        ) : (
          /* 이미지가 업로드된 작업 환경 */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* 상단 뷰어: 원본 vs 압축본 비포/애프터 분할 비교 */}
            {activeImage && activeImage.result && (
              <div
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: '20px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                }}
              >
                {/* 뷰어 상단 정보 바 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-main)' }}>
                      {activeImage.name}
                    </span>
                    <span
                      style={{
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        color: '#10b981',
                        background: 'rgba(16, 185, 129, 0.15)',
                        border: '1px solid rgba(16, 185, 129, 0.35)',
                        borderRadius: '6px',
                        padding: '2px 8px',
                      }}
                    >
                      -{activeImage.result.savedPercent.toFixed(1)}% 절감
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>
                      원본: <strong style={{ color: 'var(--text-main)' }}>{formatBytes(activeImage.originalSize)}</strong>
                    </span>
                    <ArrowRight size={14} style={{ color: 'var(--text-muted)' }} />
                    <span style={{ color: 'var(--text-muted)' }}>
                      압축본: <strong style={{ color: '#0395FC' }}>{formatBytes(activeImage.result.compressedSize)}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDownloadSingle(activeImage)}
                      style={{
                        marginLeft: '8px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 14px',
                        borderRadius: '8px',
                        background: 'rgba(1, 74, 255, 0.2)',
                        border: '1px solid rgba(1, 74, 255, 0.4)',
                        color: '#0395FC',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      <Download size={14} /> 다운로드
                    </button>
                  </div>
                </div>

                {/* 분할 비교 인터랙티브 캔버스/이미지 박스 */}
                <div
                  ref={compareContainerRef}
                  style={{
                    position: 'relative',
                    width: '100%',
                    height: '420px',
                    borderRadius: '14px',
                    overflow: 'hidden',
                    background: '#09090b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    userSelect: 'none',
                    cursor: 'ew-resize',
                  }}
                  onMouseDown={handleMouseDownSlider}
                  onTouchMove={(e) => handleSliderMove(e.touches[0].clientX)}
                >
                  {/* 우측 레이어: 압축본 (전체 깔림) */}
                  <img
                    src={activeImage.result.dataUrl}
                    alt="압축본"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                    }}
                  />

                  {/* 좌측 레이어: 원본 (클리핑 패스로 슬라이더 위치만큼만 가림) */}
                  <img
                    src={activeImage.previewUrl}
                    alt="원본"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      clipPath: `inset(0 ${100 - compareSliderPos}% 0 0)`,
                    }}
                  />

                  {/* 수직 분할선 및 드래그 핸들 */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      bottom: 0,
                      left: `${compareSliderPos}%`,
                      width: '2px',
                      background: '#ffffff',
                      boxShadow: '0 0 10px rgba(0,0,0,0.8)',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: '#ffffff',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#000000',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                      }}
                    >
                      ↔
                    </div>
                  </div>

                  {/* 뱃지: 원본 / 압축본 라벨 */}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '12px',
                      left: '12px',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      background: 'rgba(0, 0, 0, 0.75)',
                      backdropFilter: 'blur(8px)',
                      color: 'var(--text-main)',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      pointerEvents: 'none',
                    }}
                  >
                    원본 ({formatBytes(activeImage.originalSize)})
                  </div>
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '12px',
                      right: '12px',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      background: 'rgba(0, 0, 0, 0.75)',
                      backdropFilter: 'blur(8px)',
                      color: '#0395FC',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      pointerEvents: 'none',
                    }}
                  >
                    압축본 ({formatBytes(activeImage.result.compressedSize)})
                  </div>
                </div>

                <div style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  💡 중앙 분할 슬라이더를 좌우로 드래그하여 원본과 압축본의 화질을 비교하세요.
                </div>
              </div>
            )}

            {/* 하단: 업로드된 파일 대기열 및 일괄 액션 */}
            <div
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: '20px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              {/* 대기열 헤더 및 액션 버튼군 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>
                    파일 목록 ({images.length}개)
                  </span>
                  {totalStats.savedBytes > 0 && (
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      전체 절감:{' '}
                      <strong style={{ color: '#10b981' }}>
                        {formatBytes(totalStats.savedBytes)} (-{totalStats.savedPercent.toFixed(1)}%)
                      </strong>
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-main)',
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                    }}
                  >
                    <Upload size={13} /> 추가 업로드
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadAll}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '6px 14px',
                      borderRadius: '8px',
                      background: 'rgba(1, 74, 255, 0.2)',
                      border: '1px solid rgba(1, 74, 255, 0.4)',
                      color: '#0395FC',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <Download size={13} /> 전체 다운로드
                  </button>
                  <button
                    type="button"
                    onClick={handleClearAll}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      background: 'rgba(239, 68, 68, 0.12)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      color: '#f87171',
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                    }}
                    title="목록 비우기"
                  >
                    <Trash2 size={13} /> 모두 비우기
                  </button>
                </div>
              </div>

              {/* 파일 카드 그리드 */}
              <div
                className="custom-scrollbar"
                data-lenis-prevent
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                  gap: '12px',
                  maxHeight: '360px',
                  overflowY: 'auto',
                  paddingRight: '6px',
                }}
              >
                {images.map((img) => {
                  const isSelected = img.id === activeImage?.id;
                  const fmtLabel = img.options.targetFormat.replace('image/', '').toUpperCase();
                  const qualityLabel = img.options.targetFormat !== 'image/png' ? `${Math.round(img.options.quality * 100)}%` : 'Lossless';
                  const scaleLabel = img.options.scalePreset > 0 && img.options.scalePreset < 1 ? ` · ${img.options.scalePreset * 100}%` : '';

                  return (
                    <div
                      key={img.id}
                      onClick={() => setSelectedImageId(img.id)}
                      style={{
                        background: isSelected ? 'rgba(1, 74, 255, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                        border: isSelected ? '1px solid #0395FC' : '1px solid var(--border)',
                        boxShadow: isSelected ? '0 0 16px rgba(1, 74, 255, 0.25)' : 'none',
                        borderRadius: '12px',
                        padding: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.18s',
                        position: 'relative',
                      }}
                    >
                      <div style={{ position: 'relative', width: '48px', height: '48px', flexShrink: 0 }}>
                        <img
                          src={img.previewUrl}
                          alt={img.name}
                          style={{
                            width: '100%',
                            height: '100%',
                            borderRadius: '8px',
                            objectFit: 'cover',
                            background: '#18181b',
                          }}
                        />
                        {isSelected && (
                          <div
                            style={{
                              position: 'absolute',
                              top: '-4px',
                              right: '-4px',
                              width: '12px',
                              height: '12px',
                              borderRadius: '50%',
                              background: '#0395FC',
                              border: '2px solid #000',
                            }}
                          />
                        )}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span
                            style={{
                              fontSize: '0.85rem',
                              fontWeight: 600,
                              color: isSelected ? '#0395FC' : 'var(--text-main)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                            title={img.name}
                          >
                            {img.name}
                          </span>
                        </div>

                        {/* 개별 설정 뱃지 및 용량 통계 */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px', flexWrap: 'wrap' }}>
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              background: 'rgba(255, 255, 255, 0.08)',
                              color: isSelected ? '#0395FC' : 'var(--text-muted)',
                              padding: '1px 5px',
                              borderRadius: '4px',
                            }}
                          >
                            {fmtLabel} ({qualityLabel}){scaleLabel}
                          </span>

                          {img.isProcessing ? (
                            <span style={{ fontSize: '0.74rem', color: '#0395FC' }}>
                              🔄 압축 중...
                            </span>
                          ) : img.result ? (
                            <span style={{ fontSize: '0.74rem', color: '#10b981', fontWeight: 600 }}>
                              -{img.result.savedPercent.toFixed(0)}% ({formatBytes(img.result.compressedSize)})
                            </span>
                          ) : <span role="alert" style={{ fontSize: '0.74rem', color: '#f87171' }}>이미지를 변환하지 못했습니다.</span>}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadSingle(img);
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            padding: '4px',
                          }}
                          title="다운로드"
                          disabled={!img.result || img.isProcessing}
                        >
                          <Download size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setImages((prev) => {
                              const next = prev.filter((it) => it.id !== img.id);
                              if (selectedImageId === img.id) {
                                setSelectedImageId(next.length > 0 ? next[0].id : null);
                              }
                              return next;
                            });
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            padding: '4px',
                          }}
                          title="삭제"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      <aside className="post-sidebar post-sidebar-right"></aside>
    </motion.div>
  );
}
