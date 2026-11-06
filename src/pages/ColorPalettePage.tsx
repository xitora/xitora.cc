import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Palette,
  ChevronLeft,
  Copy,
  Check,
  Upload,
  Image as ImageIcon,
  Sparkles,
  Sliders,
  CheckCircle2,
  XCircle,
  Eye,
  RotateCcw,
  Shuffle,
  Lock,
  Unlock,
  Undo2,
  Redo2,
  Dices,
  History,
  Trash2,
  Download
} from "lucide-react";
import FloatingToolHeader from "../components/FloatingToolHeader";
import {
  hexToRgb,
  rgbToHex,
  rgbToHsl,
  hslToHex,
  getLuminance,
  getWcagRating,
  generateHarmonies,
  extractPaletteFromImageData,
  generateInfinite5Palette,
  renderPaletteCanvas,
  PALETTE_MOOD_OPTIONS,
  type PaletteMood,
  type ColorItem
} from "../utils/colorPalette";

interface ColorPalettePageProps {
  onNavigate: (path: string) => void;
  currentPath?: string;
}

type PaletteTab = "extract" | "harmony" | "contrast" | "generator";

export default function ColorPalettePage({ onNavigate }: ColorPalettePageProps) {
  // 1. 활성 탭 및 상태
  const [activeTab, setActiveTab] = useState<PaletteTab>("extract");

  // 현재 기준 주 색상
  const [baseColor, setBaseColor] = useState("#38bdf8");

  // 모바일 화면 감지 상태
  const [isMobile, setIsMobile] = useState(() => (typeof window !== "undefined" ? window.innerWidth < 768 : false));

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // 추출된 팔레트 목록 (프리셋/이미지 업로드 전에는 비어있음)
  const [extractedPalette, setExtractedPalette] = useState<ColorItem[]>([]);

  // 이미지 프리뷰 URL
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  // 명도 대비 테스터 상태 (전경색 vs 배경색)
  const [contrastFg, setContrastFg] = useState("#ffffff");
  const [contrastBg, setContrastBg] = useState("#0f172a");

  // 복사 알림 키
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // 파일 업로드 input 레퍼런스
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // 2. 조화 팔레트 연산
  const harmonies = useMemo(() => {
    return generateHarmonies(baseColor);
  }, [baseColor]);

  // 3. WCAG 명도 대비 연산
  const contrastRating = useMemo(() => {
    return getWcagRating(contrastFg, contrastBg);
  }, [contrastFg, contrastBg]);

  // 클립보드 복사 헬퍼
  const handleCopy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1800);
    } catch (err) {
      console.error("복사 실패:", err);
    }
  };

  // 4. 이미지 픽셀에서 색상 추출 핸들러
  const processImageFile = useCallback((file: File) => {
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setImagePreviewUrl(dataUrl);

        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          if (!ctx) return;

          // 성능을 위해 캔버스 최대 크기를 200x200으로 다운샘플링
          const maxDim = 200;
          let w = img.width;
          let h = img.height;
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }

          canvas.width = w;
          canvas.height = h;
          ctx.drawImage(img, 0, 0, w, h);

          const imgData = ctx.getImageData(0, 0, w, h);
          const palette = extractPaletteFromImageData(imgData.data, 6);
          setExtractedPalette(palette);
          if (palette.length > 0) {
            setBaseColor(palette[0].hex);
            setContrastBg(palette[0].hex);
          }
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("이미지 분석 오류:", err);
    }
  }, []);

  // 드롭 & 붙여넣기 이벤트 리스너
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          const file = items[i].getAsFile();
          if (file) {
            processImageFile(file);
            setActiveTab("extract");
            break;
          }
        }
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [processImageFile]);

  // 데모 샘플 이미지 로드
  const handleLoadDemoImage = () => {
    // 캔버스에 그라데이션 및 기하학적 도형으로 풍부한 샘플 이미지 생성
    const canvas = document.createElement("canvas");
    canvas.width = 400;
    canvas.height = 300;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const grad = ctx.createLinearGradient(0, 0, 400, 300);
    grad.addColorStop(0, "#0f172a");
    grad.addColorStop(0.3, "#0284c7");
    grad.addColorStop(0.6, "#f43f5e");
    grad.addColorStop(1, "#fde047");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 400, 300);

    ctx.fillStyle = "#818cf8";
    ctx.beginPath();
    ctx.arc(200, 150, 70, 0, Math.PI * 2);
    ctx.fill();

    const dataUrl = canvas.toDataURL("image/png");
    setImagePreviewUrl(dataUrl);

    const imgData = ctx.getImageData(0, 0, 400, 300);
    const palette = extractPaletteFromImageData(imgData.data, 6);
    setExtractedPalette(palette);
    if (palette.length > 0) {
      setBaseColor(palette[0].hex);
    }
  };

  // 팔레트 생성기 상태
  const [palette5, setPalette5] = useState<[string, string, string, string, string]>(() => {
    const init = generateInfinite5Palette([null, null, null, null, null], "all");
    return init.colors;
  });
  const [lockedSlots, setLockedSlots] = useState<boolean[]>([false, false, false, false, false]);
  const [paletteMood, setPaletteMood] = useState<PaletteMood>("all");
  const [history, setHistory] = useState<Array<[string, string, string, string, string]>>(() => [
    palette5
  ]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // 최근 생성 기록 (세션 전용)
  interface PaletteHistoryItem {
    colors: [string, string, string, string, string];
    mood?: PaletteMood;
    time: string;
  }
  const [recentHistory, setRecentHistory] = useState<PaletteHistoryItem[]>(() => [
    {
      colors: palette5,
      mood: "all",
      time: new Date().toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      })
    }
  ]);

  // 팔레트 생성기 실행 함수
  const handleGenerateInfinite = useCallback(
    (forcedMood?: PaletteMood) => {
      try {
        const targetMood = forcedMood !== undefined ? forcedMood : paletteMood;
        const lockedColors: (string | null)[] = palette5.map((c, i) => (lockedSlots[i] ? c : null));
        const res = generateInfinite5Palette(lockedColors, targetMood);
        setPalette5(res.colors);
        if (forcedMood !== undefined) {
          setPaletteMood(forcedMood);
        }

        // 히스토리 관리 (Undo/Redo)
        setHistory((prev) => {
          const next = prev.slice(0, historyIndex + 1);
          next.push(res.colors);
          if (next.length > 25) next.shift();
          return next;
        });
        setHistoryIndex((prev) => Math.min(prev + 1, 24));

        // 최근 생성 기록 추가 (최대 20개 유지)
        const timeStr = new Date().toLocaleTimeString("ko-KR", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit"
        });
        setRecentHistory((prev) => [
          { colors: res.colors, mood: targetMood, time: timeStr },
          ...prev.slice(0, 19)
        ]);
      } catch (err) {
        console.error("팔레트 생성 오류:", err);
      }
    },
    [palette5, lockedSlots, paletteMood, historyIndex]
  );

  // 개별 슬롯 잠금 토글
  const handleToggleLock = (idx: number) => {
    try {
      setLockedSlots((prev) => {
        const next = [...prev];
        next[idx] = !next[idx];
        return next;
      });
    } catch (err) {
      console.error("슬롯 잠금 토글 오류:", err);
    }
  };

  // 개별 슬롯 색상 수동 변경
  const handleSlotColorChange = (idx: number, newHex: string) => {
    try {
      setPalette5((prev) => {
        const next = [...prev] as [string, string, string, string, string];
        next[idx] = newHex;
        return next;
      });
    } catch (err) {
      console.error("색상 수정 오류:", err);
    }
  };

  // 히스토리 실행 취소 (Undo)
  const handleUndo = () => {
    try {
      if (historyIndex > 0) {
        const newIdx = historyIndex - 1;
        setHistoryIndex(newIdx);
        setPalette5(history[newIdx]);
      }
    } catch (err) {
      console.error("실행 취소 오류:", err);
    }
  };

  // 히스토리 다시 실행 (Redo)
  const handleRedo = () => {
    try {
      if (historyIndex < history.length - 1) {
        const newIdx = historyIndex + 1;
        setHistoryIndex(newIdx);
        setPalette5(history[newIdx]);
      }
    } catch (err) {
      console.error("다시 실행 오류:", err);
    }
  };

  // 포토샵/디자인 작업용 팔레트 PNG 이미지 저장 핸들러
  const handleDownloadPaletteImage = useCallback(() => {
    try {
      const moodOpt = PALETTE_MOOD_OPTIONS.find((m) => m.id === paletteMood) || PALETTE_MOOD_OPTIONS[0];
      const canvas = renderPaletteCanvas(palette5, moodOpt.label);
      if (!canvas) return;

      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `palette-${paletteMood}-${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setCopiedKey("palette5-img-download");
        setTimeout(() => setCopiedKey(null), 2000);
      }, "image/png");
    } catch (err) {
      console.error("팔레트 이미지 저장 오류:", err);
    }
  }, [palette5, paletteMood]);

  // 포토샵 붙여넣기용 팔레트 PNG 이미지 클립보드 복사 핸들러
  const handleCopyPaletteImage = useCallback(async () => {
    try {
      const moodOpt = PALETTE_MOOD_OPTIONS.find((m) => m.id === paletteMood) || PALETTE_MOOD_OPTIONS[0];
      const canvas = renderPaletteCanvas(palette5, moodOpt.label);
      if (!canvas) return;

      canvas.toBlob(async (blob) => {
        if (!blob) return;
        try {
          if (navigator.clipboard && window.ClipboardItem) {
            const item = new ClipboardItem({ "image/png": blob });
            await navigator.clipboard.write([item]);
            setCopiedKey("palette5-img-copied");
            setTimeout(() => setCopiedKey(null), 2500);
          } else {
            handleDownloadPaletteImage();
          }
        } catch (copyErr) {
          console.warn("클립보드 이미지 복사 미지원 브라우저 환경, 다운로드로 대체:", copyErr);
          handleDownloadPaletteImage();
        }
      }, "image/png");
    } catch (err) {
      console.error("팔레트 이미지 복사 오류:", err);
    }
  }, [palette5, paletteMood, handleDownloadPaletteImage]);

  // 스페이스바를 누르면 새 팔레트 생성 (generator 탭일 때)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeTab !== "generator") return;
      if (e.code === "Space") {
        const target = e.target as HTMLElement | null;
        const tagName = target?.tagName?.toLowerCase();
        if (tagName === "input" || tagName === "textarea" || tagName === "select" || target?.isContentEditable) {
          return;
        }
        e.preventDefault();
        handleGenerateInfinite();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTab, handleGenerateInfinite]);

  // 5. 상단 플로팅 미니 위젯
  const miniWidgetContent = (
    <div style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", justifyContent: "space-between" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 3, flexShrink: 0 }}>
          {extractedPalette.slice(0, 5).map((c, i) => (
            <div
              key={i}
              onClick={() => setBaseColor(c.hex)}
              style={{
                width: 18,
                height: 18,
                borderRadius: 4,
                background: c.hex,
                border: "1px solid rgba(255,255,255,0.2)",
                cursor: "pointer"
              }}
              title={c.hex}
            />
          ))}
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
          {baseColor}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
        <button
          onClick={() => handleCopy("mini-base", baseColor)}
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
          {copiedKey === "mini-base" ? <Check size={12} color="#38bdf8" /> : <Copy size={12} />}
          <span>HEX 복사</span>
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
        toolName="색상 팔레트 분석 도구"
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
                justifyContent: "center",
              }}
            >
              <Palette size={24} stroke="url(#toolIconGradient)" />
            </div>
            <div>
              <h1 style={{ fontSize: "1.75rem", fontWeight: 700, margin: 0, letterSpacing: "-0.03em" }}>
                색상 팔레트 분석 도구
              </h1>
              <p style={{ fontSize: "0.92rem", color: "#888", margin: 0, marginTop: 4 }}>
                이미지 주요 색상 자동 추출, 조화(Harmony) 팔레트 생성 및 WCAG 명도 대비 분석
              </p>
            </div>
          </div>
        </div>

        {/* 4. 탭 네비게이션: 모바일에서는 드롭다운 셀렉터, 데스크톱에서는 탭 버튼 */}
        <div style={{ marginBottom: 24 }}>
          {isMobile ? (
            /* 모바일 전용 드롭다운 셀렉터 */
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: "0.8rem", color: "#888", fontWeight: 500 }}>팔레트 도구 기능</label>
              <div style={{ position: "relative" }}>
                <select
                  value={activeTab}
                  onChange={(e) => setActiveTab(e.target.value as PaletteTab)}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    background: "#141822",
                    border: "1px solid rgba(1, 74, 255, 0.4)",
                    borderRadius: 12,
                    color: "#fff",
                    fontSize: "0.92rem",
                    fontWeight: 600,
                    appearance: "none",
                    outline: "none",
                    cursor: "pointer",
                    boxSizing: "border-box"
                  }}
                >
                  <option value="extract">🖼️ 이미지 색상 추출</option>
                  <option value="harmony">✨ 색채 조화 생성</option>
                  <option value="contrast">👁️ WCAG 명도 대비</option>
                  <option value="generator">🎲 팔레트 생성기</option>
                </select>
              </div>
            </div>
          ) : (
            /* 데스크톱 탭 목록 */
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                paddingBottom: 8,
                overflowX: "auto",
                whiteSpace: "nowrap",
                scrollbarWidth: "none"
              }}
            >
              {[
                { id: "extract", label: "이미지 색상 추출", icon: ImageIcon },
                { id: "harmony", label: "색채 조화 생성", icon: Sparkles },
                { id: "contrast", label: "WCAG 명도 대비", icon: Eye },
                { id: "generator", label: "팔레트 생성기", icon: Shuffle }
              ].map((tab) => {
                const IconComp = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as PaletteTab)}
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
          )}
        </div>

        {/* 5. 탭별 메인 컨텐츠 영역 */}

        {/* 5-1. 이미지에서 색상 추출 탭 */}
        {activeTab === "extract" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* 업로드 존 */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files?.[0];
                if (file && file.type.startsWith("image/")) {
                  processImageFile(file);
                }
              }}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: "2px dashed rgba(255, 255, 255, 0.15)",
                borderRadius: 16,
                padding: "36px 20px",
                textAlign: "center",
                background: "rgba(255, 255, 255, 0.02)",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) processImageFile(file);
                }}
                style={{ display: "none" }}
              />

              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    background: "rgba(1, 74, 255, 0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#0395FC"
                  }}
                >
                  <Upload size={22} />
                </div>
                <div>
                  <span style={{ fontSize: "0.95rem", fontWeight: 600, color: "#eee" }}>
                    이미지를 드래그하거나 클릭하여 업로드
                  </span>
                  <p style={{ fontSize: "0.82rem", color: "#888", margin: "4px 0 0" }}>
                    클립보드 이미지 붙여넣기(Ctrl+V) 지원 | JPG, PNG, WEBP, SVG
                  </p>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLoadDemoImage();
                  }}
                  className="btn-glass"
                  style={{
                    marginTop: 6,
                    padding: "6px 14px",
                    borderRadius: 8,
                    background: "rgba(255, 255, 255, 0.06)",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    color: "#ccc",
                    fontSize: "0.8rem",
                    cursor: "pointer"
                  }}
                >
                  샘플 이미지로 분석해보기
                </button>
              </div>
            </div>

            {/* 이미지 미리보기 및 추출된 팔레트 */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                gap: 20,
                alignItems: "start"
              }}
            >
              {/* 이미지 썸네일 */}
              {imagePreviewUrl && (
                <div
                  style={{
                    borderRadius: 16,
                    overflow: "hidden",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    background: "rgba(0, 0, 0, 0.4)",
                    height: 240,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                >
                  <img
                    src={imagePreviewUrl}
                    alt="Analyzed source"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                </div>
              )}

              {/* 추출된 팔레트 카드 그리드 */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <span style={{ fontSize: "0.88rem", fontWeight: 600, color: "#ccc" }}>
                  추출된 도미넌트 팔레트 ({extractedPalette.length}색)
                </span>

                {extractedPalette.length === 0 ? (
                  <div
                    style={{
                      padding: "24px 16px",
                      textAlign: "center",
                      color: "#888",
                      fontSize: "0.82rem",
                      borderRadius: 12,
                      border: "1px dashed rgba(255, 255, 255, 0.1)",
                      background: "rgba(0, 0, 0, 0.2)"
                    }}
                  >
                    추출된 색상이 없습니다. 상단에서 이미지를 업로드하거나 샘플 이미지를 클릭하세요.
                  </div>
                ) : (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                      gap: 10
                    }}
                  >
                    {extractedPalette.map((color, idx) => {
                    const whiteContrast = getWcagRating("#ffffff", color.hex).ratio;
                    const textColor = whiteContrast >= 4.5 ? "#ffffff" : "#000000";

                    return (
                      <div
                        key={idx}
                        onClick={() => {
                          setBaseColor(color.hex);
                          setContrastBg(color.hex);
                        }}
                        style={{
                          borderRadius: 12,
                          overflow: "hidden",
                          border: "1px solid rgba(255, 255, 255, 0.08)",
                          background: "rgba(255, 255, 255, 0.02)",
                          cursor: "pointer",
                          transition: "transform 0.15s, border-color 0.15s"
                        }}
                      >
                        <div
                          style={{
                            height: 72,
                            background: color.hex,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: textColor,
                            fontWeight: 700,
                            fontSize: "0.88rem",
                            fontFamily: "var(--font-mono)"
                          }}
                        >
                          {color.hex}
                        </div>

                        <div style={{ padding: "8px 10px", display: "flex", flexDirection: "column", gap: 4 }}>
                          <span style={{ fontSize: "0.75rem", color: "#888", fontFamily: "var(--font-mono)" }}>
                            rgb({color.rgb.r}, {color.rgb.g}, {color.rgb.b})
                          </span>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopy(`color-${idx}`, color.hex);
                            }}
                            style={{
                              marginTop: 2,
                              background: "none",
                              border: "none",
                              color: copiedKey === `color-${idx}` ? "#38bdf8" : "#aaa",
                              fontSize: "0.75rem",
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                              cursor: "pointer",
                              padding: 0
                            }}
                          >
                            {copiedKey === `color-${idx}` ? <Check size={12} /> : <Copy size={12} />}
                            <span>{copiedKey === `color-${idx}` ? "복사됨" : "HEX 복사"}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            </div>
          </div>
        )}

        {/* 5-2. 색채 조화 (Harmony) 탭 */}
        {activeTab === "harmony" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* 기준 색상 피커 바 */}
            <div
              style={{
                background: "rgba(255, 255, 255, 0.02)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: 16,
                padding: "16px 20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 12
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <input
                  type="color"
                  value={baseColor}
                  onChange={(e) => setBaseColor(e.target.value)}
                  style={{ width: 44, height: 44, border: "none", background: "none", cursor: "pointer" }}
                />
                <div>
                  <span style={{ fontSize: "0.8rem", color: "#888" }}>기준 색상 (Base Color)</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      type="text"
                      value={baseColor}
                      onChange={(e) => setBaseColor(e.target.value)}
                      style={{
                        padding: "4px 8px",
                        borderRadius: 6,
                        background: "rgba(0,0,0,0.5)",
                        border: "1px solid rgba(255,255,255,0.12)",
                        color: "#fff",
                        fontFamily: "var(--font-mono)",
                        fontSize: "0.92rem",
                        width: 100
                      }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 6 }}>
                {["#38bdf8", "#014AFF", "#34d399", "#f59e0b", "#f43f5e", "#ec4899"].map((hex) => (
                  <button
                    key={hex}
                    onClick={() => setBaseColor(hex)}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: hex,
                      border: baseColor === hex ? "2px solid #fff" : "1px solid rgba(255,255,255,0.2)",
                      cursor: "pointer"
                    }}
                  />
                ))}
              </div>
            </div>

            {/* 5가지 조화 유형 섹션 */}
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {[
                { title: "보색 (Complementary)", desc: "180도 반대편의 강렬한 대비 색상", colors: harmonies.complementary },
                { title: "유사색 (Analogous)", desc: "색상환에서 인접한 자연스럽고 부드러운 조화", colors: harmonies.analogous },
                { title: "삼색조 (Triadic)", desc: "120도 등간격 3색의 활기찬 균형", colors: harmonies.triadic },
                { title: "사색조 (Tetradic)", desc: "90도 등간격 4색의 풍부한 스펙트럼", colors: harmonies.tetradic },
                { title: "단색조 (Monochromatic)", desc: "동일 색상의 명도 단계별 그라데이션", colors: harmonies.monochromatic }
              ].map((h, idx) => (
                <div
                  key={idx}
                  style={{
                    background: "rgba(255, 255, 255, 0.02)",
                    border: "1px solid rgba(255, 255, 255, 0.06)",
                    borderRadius: 14,
                    padding: 16
                  }}
                >
                  <div style={{ marginBottom: 10 }}>
                    <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "#fff" }}>{h.title}</span>
                    <span style={{ fontSize: "0.78rem", color: "#888", marginLeft: 8 }}>{h.desc}</span>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: `repeat(${h.colors.length}, 1fr)`,
                      height: 56,
                      borderRadius: 10,
                      overflow: "hidden",
                      border: "1px solid rgba(255,255,255,0.08)"
                    }}
                  >
                    {h.colors.map((c, cIdx) => (
                      <div
                        key={cIdx}
                        onClick={() => handleCopy(`harmony-${idx}-${cIdx}`, c)}
                        style={{
                          background: c,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          fontSize: "0.78rem",
                          fontFamily: "var(--font-mono)",
                          color: getWcagRating("#ffffff", c).ratio >= 4.5 ? "#ffffff" : "#000000",
                          fontWeight: 600,
                          transition: "opacity 0.15s"
                        }}
                        title={`클릭하여 ${c} 복사`}
                      >
                        {copiedKey === `harmony-${idx}-${cIdx}` ? "복사됨!" : c}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 5-3. WCAG 명도 대비 테스터 탭 */}
        {activeTab === "contrast" && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: 20,
              alignItems: "start"
            }}
          >
            {/* 설정 패널 */}
            <div
              style={{
                background: "rgba(255, 255, 255, 0.02)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: 16,
                padding: 20,
                display: "flex",
                flexDirection: "column",
                gap: 16
              }}
            >
              <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "#fff" }}>
                텍스트 및 배경 색상 선택
              </span>

              <div>
                <label style={{ display: "block", fontSize: "0.82rem", color: "#aaa", marginBottom: 6 }}>
                  전경색 (텍스트)
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <input
                    type="color"
                    value={contrastFg}
                    onChange={(e) => setContrastFg(e.target.value)}
                    style={{ width: 38, height: 38, border: "none", background: "none", cursor: "pointer" }}
                  />
                  <input
                    type="text"
                    value={contrastFg}
                    onChange={(e) => setContrastFg(e.target.value)}
                    style={{
                      flex: 1,
                      padding: "8px 10px",
                      background: "rgba(0,0,0,0.4)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 8,
                      color: "#fff",
                      fontFamily: "var(--font-mono)"
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.82rem", color: "#aaa", marginBottom: 6 }}>
                  배경색 (Background)
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <input
                    type="color"
                    value={contrastBg}
                    onChange={(e) => setContrastBg(e.target.value)}
                    style={{ width: 38, height: 38, border: "none", background: "none", cursor: "pointer" }}
                  />
                  <input
                    type="text"
                    value={contrastBg}
                    onChange={(e) => setContrastBg(e.target.value)}
                    style={{
                      flex: 1,
                      padding: "8px 10px",
                      background: "rgba(0,0,0,0.4)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 8,
                      color: "#fff",
                      fontFamily: "var(--font-mono)"
                    }}
                  />
                </div>
              </div>

              {/* 반전 스왑 버튼 */}
              <button
                onClick={() => {
                  const temp = contrastFg;
                  setContrastFg(contrastBg);
                  setContrastBg(temp);
                }}
                className="btn-glass"
                style={{
                  padding: "8px",
                  borderRadius: 8,
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  color: "#ccc",
                  fontSize: "0.82rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6
                }}
              >
                <RotateCcw size={14} />
                <span>색상 반전(스왑)</span>
              </button>
            </div>

            {/* 실시간 미리보기 및 WCAG 등급 카드 */}
            <div
              style={{
                background: "rgba(255, 255, 255, 0.02)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: 16,
                padding: 20,
                display: "flex",
                flexDirection: "column",
                gap: 16
              }}
            >
              {/* 실시간 렌더링 박스 */}
              <div
                style={{
                  background: contrastBg,
                  color: contrastFg,
                  padding: "24px 20px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.1)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8
                }}
              >
                <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700 }}>
                  가독성 실시간 미리보기 텍스트
                </h3>
                <p style={{ margin: 0, fontSize: "0.9rem", lineHeight: 1.5 }}>
                  웹 접근성 표준에 따라 본문 텍스트는 4.5:1 이상, 대형 헤드라인은 3.0:1 이상의 대비를 만족해야 사용자가 편안하게 읽을 수 있습니다.
                </p>
              </div>

              {/* 대비 점수 및 등급 뱃지 */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <span style={{ fontSize: "0.8rem", color: "#888" }}>명도 대비율</span>
                  <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#38bdf8" }}>
                    {contrastRating.ratio}:1
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div
                    style={{
                      padding: "6px 12px",
                      borderRadius: 8,
                      background: contrastRating.aaNormal ? "rgba(34, 197, 94, 0.15)" : "rgba(239, 68, 68, 0.15)",
                      border: `1px solid ${contrastRating.aaNormal ? "rgba(34, 197, 94, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
                      color: contrastRating.aaNormal ? "#22c55e" : "#ef4444",
                      fontSize: "0.78rem",
                      display: "flex",
                      alignItems: "center",
                      gap: 4
                    }}
                  >
                    {contrastRating.aaNormal ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                    <span>AA 일반</span>
                  </div>

                  <div
                    style={{
                      padding: "6px 12px",
                      borderRadius: 8,
                      background: contrastRating.aaLarge ? "rgba(34, 197, 94, 0.15)" : "rgba(239, 68, 68, 0.15)",
                      border: `1px solid ${contrastRating.aaLarge ? "rgba(34, 197, 94, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
                      color: contrastRating.aaLarge ? "#22c55e" : "#ef4444",
                      fontSize: "0.78rem",
                      display: "flex",
                      alignItems: "center",
                      gap: 4
                    }}
                  >
                    {contrastRating.aaLarge ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                    <span>AA 대형</span>
                  </div>

                  <div
                    style={{
                      padding: "6px 12px",
                      borderRadius: 8,
                      background: contrastRating.aaaNormal ? "rgba(34, 197, 94, 0.15)" : "rgba(239, 68, 68, 0.15)",
                      border: `1px solid ${contrastRating.aaaNormal ? "rgba(34, 197, 94, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
                      color: contrastRating.aaaNormal ? "#22c55e" : "#ef4444",
                      fontSize: "0.78rem",
                      display: "flex",
                      alignItems: "center",
                      gap: 4
                    }}
                  >
                    {contrastRating.aaaNormal ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                    <span>AAA 일반</span>
                  </div>

                  <div
                    style={{
                      padding: "6px 12px",
                      borderRadius: 8,
                      background: contrastRating.aaaLarge ? "rgba(34, 197, 94, 0.15)" : "rgba(239, 68, 68, 0.15)",
                      border: `1px solid ${contrastRating.aaaLarge ? "rgba(34, 197, 94, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
                      color: contrastRating.aaaLarge ? "#22c55e" : "#ef4444",
                      fontSize: "0.78rem",
                      display: "flex",
                      alignItems: "center",
                      gap: 4
                    }}
                  >
                    {contrastRating.aaaLarge ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                    <span>AAA 대형</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 5-4. 팔레트 생성기 탭 */}
        {activeTab === "generator" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* 메인 5색 비주얼 디스플레이 바 / 카드 컬럼 */}
            <div
              style={{
                background: "rgba(255, 255, 255, 0.02)",
                border: "1px solid rgba(1, 74, 255, 0.3)",
                borderRadius: 20,
                padding: 20,
                display: "flex",
                flexDirection: "column",
                gap: 18,
                boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)"
              }}
            >
              {/* 상단 헤더 & 컨트롤 */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Dices size={20} color="#0395FC" />
                    <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#fff" }}>
                      팔레트 생성기
                    </h3>
                  </div>
                </div>

                {/* 상단 퀵 액션 버튼들 */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  {/* Undo / Redo */}
                  <div style={{ display: "flex", alignItems: "center", background: "rgba(255, 255, 255, 0.04)", borderRadius: 8, border: "1px solid rgba(255, 255, 255, 0.08)", overflow: "hidden" }}>
                    <button
                      onClick={handleUndo}
                      disabled={historyIndex <= 0}
                      title="이전 팔레트 (실행 취소)"
                      style={{
                        padding: "7px 10px",
                        background: "transparent",
                        border: "none",
                        color: historyIndex <= 0 ? "#555" : "#ccc",
                        cursor: historyIndex <= 0 ? "not-allowed" : "pointer",
                        display: "flex",
                        alignItems: "center"
                      }}
                    >
                      <Undo2 size={15} />
                    </button>
                    <div style={{ width: 1, height: 16, background: "rgba(255, 255, 255, 0.08)" }} />
                    <button
                      onClick={handleRedo}
                      disabled={historyIndex >= history.length - 1}
                      title="다음 팔레트 (다시 실행)"
                      style={{
                        padding: "7px 10px",
                        background: "transparent",
                        border: "none",
                        color: historyIndex >= history.length - 1 ? "#555" : "#ccc",
                        cursor: historyIndex >= history.length - 1 ? "not-allowed" : "pointer",
                        display: "flex",
                        alignItems: "center"
                      }}
                    >
                      <Redo2 size={15} />
                    </button>
                  </div>

                  {/* 전체 HEX 복사 */}
                  <button
                    onClick={() => handleCopy("palette5-all", palette5.join(", "))}
                    title="5개 색상의 HEX 코드를 쉼표로 구분하여 복사"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      padding: "7px 12px",
                      background: "rgba(255, 255, 255, 0.05)",
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                      borderRadius: 8,
                      color: "#e2e8f0",
                      fontSize: "0.8rem",
                      cursor: "pointer",
                      transition: "all 0.15s ease"
                    }}
                  >
                    {copiedKey === "palette5-all" ? <Check size={13} color="#0395FC" /> : <Copy size={13} />}
                    <span>{copiedKey === "palette5-all" ? "전체 복사됨!" : "전체 HEX 복사"}</span>
                  </button>

                  {/* 포토샵/디자인 툴용 이미지 복사 (클립보드 PNG 복사) */}
                  <button
                    onClick={handleCopyPaletteImage}
                    title="포토샵, 피그마 등에서 Ctrl+V로 즉시 붙여넣을 수 있는 고해상도 팔레트 이미지 복사"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      padding: "7px 12px",
                      background: copiedKey === "palette5-img-copied" ? "rgba(3, 149, 252, 0.2)" : "rgba(255, 255, 255, 0.05)",
                      border: `1px solid ${copiedKey === "palette5-img-copied" ? "rgba(3, 149, 252, 0.5)" : "rgba(255, 255, 255, 0.12)"}`,
                      borderRadius: 8,
                      color: copiedKey === "palette5-img-copied" ? "#38bdf8" : "#e2e8f0",
                      fontSize: "0.8rem",
                      fontWeight: 500,
                      cursor: "pointer",
                      transition: "all 0.15s ease"
                    }}
                  >
                    {copiedKey === "palette5-img-copied" ? <Check size={13} color="#38bdf8" /> : <ImageIcon size={13} />}
                    <span>{copiedKey === "palette5-img-copied" ? "이미지 복사됨! (포토샵에 Ctrl+V)" : "이미지 복사 (포토샵)"}</span>
                  </button>

                  {/* 고해상도 팔레트 PNG 이미지 파일 저장 */}
                  <button
                    onClick={handleDownloadPaletteImage}
                    title="고해상도 팔레트 PNG 이미지 파일로 다운로드"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      padding: "7px 12px",
                      background: copiedKey === "palette5-img-download" ? "rgba(34, 197, 94, 0.2)" : "rgba(255, 255, 255, 0.05)",
                      border: `1px solid ${copiedKey === "palette5-img-download" ? "rgba(34, 197, 94, 0.5)" : "rgba(255, 255, 255, 0.12)"}`,
                      borderRadius: 8,
                      color: copiedKey === "palette5-img-download" ? "#4ade80" : "#e2e8f0",
                      fontSize: "0.8rem",
                      fontWeight: 500,
                      cursor: "pointer",
                      transition: "all 0.15s ease"
                    }}
                  >
                    {copiedKey === "palette5-img-download" ? <Check size={13} color="#4ade80" /> : <Download size={13} />}
                    <span>{copiedKey === "palette5-img-download" ? "저장 완료!" : "이미지 저장"}</span>
                  </button>
                </div>
              </div>

              {/* 5색 대형 비주얼 카드 바 (Coolors 스타일) */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "repeat(1, 1fr)" : "repeat(5, 1fr)",
                  gap: 10,
                  minHeight: isMobile ? "auto" : 340
                }}
              >
                {palette5.map((hex, index) => {
                  const isLocked = lockedSlots[index];
                  const rgb = hexToRgb(hex) || { r: 0, g: 0, b: 0 };
                  const lum = getLuminance(rgb.r, rgb.g, rgb.b);
                  const isLight = lum > 0.42;
                  const textColor = isLight ? "#0f172a" : "#ffffff";
                  const subColor = isLight ? "rgba(15, 23, 42, 0.7)" : "rgba(255, 255, 255, 0.7)";
                  const btnBg = isLight ? "rgba(0, 0, 0, 0.08)" : "rgba(255, 255, 255, 0.14)";
                  const btnBorder = isLight ? "rgba(0, 0, 0, 0.16)" : "rgba(255, 255, 255, 0.22)";
                  const isCopied = copiedKey === `p5-slot-${index}`;

                  return (
                    <div
                      key={index}
                      style={{
                        background: hex,
                        borderRadius: 14,
                        padding: isMobile ? "16px 14px" : "18px 14px",
                        display: "flex",
                        flexDirection: isMobile ? "row" : "column",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                        boxShadow: "0 6px 20px rgba(0, 0, 0, 0.25)",
                        border: isLocked ? "2px solid #0395FC" : "1px solid rgba(255, 255, 255, 0.15)",
                        transition: "background 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.2s ease",
                        position: "relative",
                        minHeight: isMobile ? 80 : 320
                      }}
                    >
                      {/* 상단(모바일 좌측): 슬롯 번호 및 잠금 버튼 */}
                      <div
                        style={{
                          display: "flex",
                          flexDirection: isMobile ? "row" : "column",
                          alignItems: "center",
                          gap: 8,
                          width: isMobile ? "auto" : "100%",
                          justifyContent: "space-between"
                        }}
                      >
                        {/* 슬롯 번호 배지 */}
                        <span
                          style={{
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            letterSpacing: "0.08em",
                            fontFamily: "var(--font-mono)",
                            color: subColor,
                            padding: "2px 6px",
                            borderRadius: 4,
                            background: btnBg
                          }}
                        >
                          0{index + 1}
                        </span>

                        {/* 🔒 / 🔓 개별 잠금/해제 버튼 */}
                        <button
                          onClick={() => handleToggleLock(index)}
                          title={isLocked ? "잠금 해제" : "색상 잠금"}
                          style={{
                            background: isLocked ? "#014AFF" : btnBg,
                            border: `1px solid ${isLocked ? "#0395FC" : btnBorder}`,
                            color: isLocked ? "#ffffff" : textColor,
                            padding: "7px 10px",
                            borderRadius: 8,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 5,
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            transition: "all 0.15s ease",
                            boxShadow: isLocked ? "0 2px 8px rgba(1, 74, 255, 0.4)" : "none"
                          }}
                        >
                          {isLocked ? <Lock size={13} /> : <Unlock size={13} />}
                          <span style={{ display: isMobile ? "none" : "inline" }}>
                            {isLocked ? "해제" : "잠금"}
                          </span>
                        </button>
                      </div>

                      {/* 중앙: 대형 HEX 표시 및 복사/수정 인터랙션 */}
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: 6,
                          textAlign: "center"
                        }}
                      >
                        <button
                          onClick={() => handleCopy(`p5-slot-${index}`, hex)}
                          title="클릭하여 HEX 복사"
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            padding: 0,
                            color: textColor,
                            display: "flex",
                            alignItems: "center",
                            gap: 5
                          }}
                        >
                          <span
                            style={{
                              fontFamily: "var(--font-mono)",
                              fontSize: isMobile ? "1.05rem" : "1.2rem",
                              fontWeight: 800,
                              letterSpacing: "0.04em",
                              textTransform: "uppercase"
                            }}
                          >
                            {hex}
                          </span>
                          {isCopied ? <Check size={14} color={textColor} /> : <Copy size={13} style={{ opacity: 0.7 }} />}
                        </button>

                        {/* RGB 서브 정보 */}
                        <div
                          style={{
                            fontSize: "0.72rem",
                            fontFamily: "var(--font-mono)",
                            color: subColor,
                            display: isMobile ? "none" : "block"
                          }}
                        >
                          RGB({rgb.r}, {rgb.g}, {rgb.b})
                        </div>
                      </div>

                      {/* 하단(모바일 우측): 컬러 피커 수정 트리거 */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          justifyContent: isMobile ? "flex-end" : "center",
                          width: isMobile ? "auto" : "100%"
                        }}
                      >
                        <label
                          title="직접 색상 선택/수정"
                          style={{
                            position: "relative",
                            background: btnBg,
                            border: `1px solid ${btnBorder}`,
                            color: textColor,
                            padding: "6px 9px",
                            borderRadius: 8,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            fontSize: "0.75rem"
                          }}
                        >
                          <Sliders size={13} />
                          <span style={{ display: isMobile ? "none" : "inline" }}>조절</span>
                          <input
                            type="color"
                            value={hex}
                            onChange={(e) => handleSlotColorChange(index, e.target.value)}
                            style={{
                              position: "absolute",
                              opacity: 0,
                              width: "100%",
                              height: "100%",
                              top: 0,
                              left: 0,
                              cursor: "pointer"
                            }}
                          />
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 하단 생성 컨트롤 & 스페이스바 단축키 알림 */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                  paddingTop: 8,
                  borderTop: "1px solid rgba(255, 255, 255, 0.08)"
                }}
              >
                {/* 생성 버튼 & 무드 태그 필터 */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: 12
                  }}
                >
                  {/* 주 생성 버튼 */}
                  <button
                    onClick={() => handleGenerateInfinite()}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "11px 22px",
                      background: "rgba(1, 74, 255, 0.22)",
                      border: "1px solid rgba(1, 74, 255, 0.45)",
                      borderRadius: 12,
                      color: "#0395FC",
                      fontSize: "0.92rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "all 0.2s ease"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(1, 74, 255, 0.32)";
                      e.currentTarget.style.transform = "translateY(-1px)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "rgba(1, 74, 255, 0.22)";
                      e.currentTarget.style.transform = "translateY(0)";
                    }}
                  >
                    <Shuffle size={18} />
                    <span>새 팔레트 생성하기</span>
                    <span
                      style={{
                        fontSize: "0.72rem",
                        background: "rgba(1, 74, 255, 0.2)",
                        color: "#0395FC",
                        padding: "2px 6px",
                        borderRadius: 4,
                        marginLeft: 4,
                        fontFamily: "var(--font-mono)"
                      }}
                    >
                      SPACE
                    </span>
                  </button>

                  {/* 무드 스타일 드롭다운 셀렉터 */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <label htmlFor="palette-mood-select" style={{ fontSize: "0.82rem", color: "#888", fontWeight: 500, whiteSpace: "nowrap" }}>
                      무드 스타일:
                    </label>
                    <div style={{ position: "relative", display: "inline-block" }}>
                      <select
                        id="palette-mood-select"
                        value={paletteMood}
                        onChange={(e) => {
                          const newMood = e.target.value as PaletteMood;
                          setPaletteMood(newMood);
                          handleGenerateInfinite(newMood);
                        }}
                        style={{
                          padding: "8px 34px 8px 12px",
                          borderRadius: 8,
                          background: "#141822",
                          border: "1px solid rgba(255, 255, 255, 0.14)",
                          color: "#fff",
                          fontSize: "0.82rem",
                          fontWeight: 600,
                          appearance: "none",
                          outline: "none",
                          cursor: "pointer",
                          transition: "border-color 0.15s ease",
                          boxSizing: "border-box"
                        }}
                        onFocus={(e) => (e.currentTarget.style.borderColor = "#0395FC")}
                        onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.14)")}
                      >
                        {PALETTE_MOOD_OPTIONS.map((moodOpt) => (
                          <option key={moodOpt.id} value={moodOpt.id} style={{ background: "#141822", color: "#fff" }}>
                            {moodOpt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* 팁 안내 바 */}
                <div
                  style={{
                    background: "rgba(1, 74, 255, 0.05)",
                    border: "1px solid rgba(1, 74, 255, 0.14)",
                    borderRadius: 10,
                    padding: "9px 14px",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: "0.8rem",
                    color: "#94a3b8"
                  }}
                >
                  <Sparkles size={15} color="#0395FC" style={{ flexShrink: 0 }} />
                  <span>
                    <strong style={{ color: "#e2e8f0" }}>단축키:</strong> <strong>Space</strong>로 새 팔레트 생성, 마음에 드는 색상은 <strong>🔒 잠금</strong>할 수 있습니다. 상단의 <strong>[이미지 복사]</strong>를 누르면 포토샵에서 <strong>Ctrl+V</strong>로 바로 붙여넣고 스포이드(I)로 색상을 추출할 수 있습니다.
                  </span>
                </div>
              </div>
            </div>

            {/* 최근 생성 기록 (현재 세션) */}
            {recentHistory.length > 0 && (
              <div
                style={{
                  background: "rgba(255, 255, 255, 0.02)",
                  border: "1px solid rgba(255, 255, 255, 0.06)",
                  borderRadius: 16,
                  padding: 18
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <History size={16} color="#0395FC" />
                    <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#fff" }}>최근 생성 기록 (현재 세션)</span>
                    <span style={{ fontSize: "0.75rem", color: "#666" }}>({recentHistory.length}개)</span>
                  </div>
                  <button
                    onClick={() => setRecentHistory([])}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#777",
                      fontSize: "0.75rem",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 4
                    }}
                  >
                    <Trash2 size={12} /> 기록 비우기
                  </button>
                </div>

                <div
                  className="custom-scrollbar"
                  data-lenis-prevent
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    maxHeight: 240,
                    overflowY: "auto",
                    paddingRight: 4
                  }}
                >
                  {recentHistory.map((h, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "8px 12px",
                        borderRadius: 8,
                        background: "rgba(0, 0, 0, 0.3)",
                        border: "1px solid rgba(255, 255, 255, 0.04)",
                        fontSize: "0.82rem",
                        gap: 12
                      }}
                    >
                      {/* 5색 미니 프리뷰 바 & HEX 텍스트 */}
                      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            display: "flex",
                            height: 22,
                            width: 85,
                            borderRadius: 5,
                            overflow: "hidden",
                            flexShrink: 0,
                            border: "1px solid rgba(255, 255, 255, 0.12)"
                          }}
                        >
                          {h.colors.map((c, i) => (
                            <div key={i} style={{ flex: 1, background: c }} title={c} />
                          ))}
                        </div>
                        <div
                          style={{
                            fontFamily: "var(--font-mono)",
                            color: "#ccc",
                            fontSize: "0.78rem",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis"
                          }}
                        >
                          {h.colors.join("  ")}
                        </div>
                      </div>

                      {/* 우측: 시간 & 불러오기 & HEX 복사 */}
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                        <span style={{ fontSize: "0.72rem", color: "#666" }}>{h.time}</span>
                        <button
                          onClick={() => {
                            setPalette5(h.colors);
                            setHistory((prev) => {
                              const next = prev.slice(0, historyIndex + 1);
                              next.push(h.colors);
                              if (next.length > 25) next.shift();
                              return next;
                            });
                            setHistoryIndex((prev) => Math.min(prev + 1, 24));
                            handleCopy(`recent-load-${idx}`, "불러왔습니다!");
                          }}
                          style={{
                            background: "rgba(1, 74, 255, 0.15)",
                            border: "1px solid rgba(1, 74, 255, 0.35)",
                            borderRadius: 6,
                            color: "#0395FC",
                            fontSize: "0.72rem",
                            padding: "3px 8px",
                            cursor: "pointer",
                            fontWeight: 500
                          }}
                          title="이 팔레트를 현재 편집창으로 불러오기"
                        >
                          {copiedKey === `recent-load-${idx}` ? "불러옴!" : "불러오기"}
                        </button>
                        <button
                          onClick={() => handleCopy(`recent-copy-${idx}`, h.colors.join(", "))}
                          style={{
                            background: "none",
                            border: "none",
                            color: copiedKey === `recent-copy-${idx}` ? "#0395FC" : "#888",
                            cursor: "pointer",
                            padding: 2,
                            display: "flex",
                            alignItems: "center"
                          }}
                          title="전체 HEX 복사"
                        >
                          {copiedKey === `recent-copy-${idx}` ? <Check size={13} /> : <Copy size={13} />}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <aside className="post-sidebar post-sidebar-right"></aside>
    </motion.div>
  );
}
