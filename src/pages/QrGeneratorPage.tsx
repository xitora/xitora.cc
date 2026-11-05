import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  QrCode,
  ChevronLeft,
  ChevronDown,
  Download,
  Copy,
  Check,
  Link,
  Wifi,
  User,
  Mail,
  MessageSquare,
  Sparkles,
  Sliders,
  Image as ImageIcon,
  AlertTriangle,
  RotateCcw,
  Palette,
  FileCode,
  ArrowLeftRight,
  ShieldCheck,
  CheckCircle2
} from "lucide-react";
import FloatingToolHeader from "../components/FloatingToolHeader";
import {
  type QrErrorCorrectionLevel,
  buildWifiPayload,
  buildVCardPayload,
  buildEmailPayload,
  buildSmsPayload,
  getContrastRatio,
  renderQrCodeToCanvas,
  generateQrSvgString
} from "../utils/qrGenerator";

interface QrGeneratorPageProps {
  onNavigate: (path: string) => void;
  currentPath?: string;
}

type QrInputType = "text" | "wifi" | "vcard" | "email" | "sms";


export default function QrGeneratorPage({ onNavigate }: QrGeneratorPageProps) {
  // 1. 입력 모드 및 폼 상태 (미리 입력된 값 없음, placeholder만 제공)
  const [inputType, setInputType] = useState<QrInputType>("text");
  const [rawText, setRawText] = useState("");

  // Wi-Fi 폼 상태
  const [wifiSsid, setWifiSsid] = useState("");
  const [wifiPassword, setWifiPassword] = useState("");
  const [wifiEncryption, setWifiEncryption] = useState<"WPA" | "WEP" | "nopass">("WPA");
  const [wifiHidden, setWifiHidden] = useState(false);

  // vCard 폼 상태
  const [vcardName, setVcardName] = useState("");
  const [vcardPhone, setVcardPhone] = useState("");
  const [vcardEmail, setVcardEmail] = useState("");
  const [vcardOrg, setVcardOrg] = useState("");
  const [vcardTitle, setVcardTitle] = useState("");

  // 이메일 폼 상태
  const [emailTo, setEmailTo] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");

  // SMS 폼 상태
  const [smsPhone, setSmsPhone] = useState("");
  const [smsMessage, setSmsMessage] = useState("");

  // 2. 스타일링 슬라이더 상태
  // 도트 곡률 (0% 사각형 ~ 100% 원형)
  const [dotRadius, setDotRadius] = useState(0);

  // 파인더 패턴 곡률 (0% 사각형 ~ 100% 원형)
  const [finderRadius, setFinderRadius] = useState(0);

  // 오류 복원율 세부 조절 슬라이더 상태 (최소 7% ~ 최대 30%)
  const [errorCorrectionPercent, setErrorCorrectionPercent] = useState(15);

  // 현재 복원율 퍼센트에 대응하는 표준 QR 오류 복원 레벨 (L: 7%, M: 15%, Q: 25%, H: 30%)
  const errorCorrection: QrErrorCorrectionLevel = useMemo(() => {
    if (errorCorrectionPercent >= 30) return "H";
    if (errorCorrectionPercent >= 25) return "Q";
    if (errorCorrectionPercent >= 15) return "M";
    return "L";
  }, [errorCorrectionPercent]);

  // 현재 복원율 구간별 안내 태그 및 설명
  const errorCorrectionInfo = useMemo(() => {
    if (errorCorrectionPercent >= 30) {
      return {
        level: "H" as const,
        tag: "최고 복원",
        desc: "최대 30% 손상 복구 지원. 극한 환경 및 중앙 로고 삽입 시 필수 권장됩니다."
      };
    }
    if (errorCorrectionPercent >= 25) {
      return {
        level: "Q" as const,
        tag: "고급 복원",
        desc: "최대 25% 손상 복구 지원. 로고 삽입 및 인쇄물 오염 가능성이 있을 때 적합합니다."
      };
    }
    if (errorCorrectionPercent >= 15) {
      return {
        level: "M" as const,
        tag: "표준",
        desc: "최대 15% 손상 복구 지원. 가장 보편적이며 일상적인 화면 및 인쇄에 최적화된 복원율입니다."
      };
    }
    return {
      level: "L" as const,
      tag: "초경량",
      desc: "최대 7% 손상 복구 지원. 데이터 밀도를 최소화하여 단순 텍스트나 소형 인쇄에 적합합니다."
    };
  }, [errorCorrectionPercent]);

  // 전경색 및 포토샵 스타일 그라데이션
  const [fgColor, setFgColor] = useState("#000000");
  const [fgColor2, setFgColor2] = useState("#014AFF");
  const [useFgGradient, setUseFgGradient] = useState(false);

  // 배경색 및 포토샵 스타일 그라데이션, 투명화
  const [bgColor, setBgColor] = useState("#ffffff");
  const [bgColor2, setBgColor2] = useState("#e0f2fe");
  const [useBgGradient, setUseBgGradient] = useState(false);
  const [isTransparentBg, setIsTransparentBg] = useState(false);

  const [margin, setMargin] = useState(2);

  // 다운로드 해상도 슬라이더 (256px ~ 2048px)
  const [exportSize, setExportSize] = useState(1024);

  // 로고 옵션
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const [logoSizePercent, setLogoSizePercent] = useState(22);

  // 상호작용 상태
  const [copiedType, setCopiedType] = useState<"img" | "text" | null>(null);
  const [isCanvasHovered, setIsCanvasHovered] = useState(false);
  const [isDownloadMenuOpen, setIsDownloadMenuOpen] = useState(false);
  const [isRendering, setIsRendering] = useState(false);

  // 레퍼런스
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const miniCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const downloadDropdownRef = useRef<HTMLDivElement | null>(null);

  // 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (downloadDropdownRef.current && !downloadDropdownRef.current.contains(e.target as Node)) {
        setIsDownloadMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 3. 현재 입력 페이로드 텍스트 산출
  const finalPayload = useMemo(() => {
    try {
      switch (inputType) {
        case "text":
          return rawText.trim();
        case "wifi":
          return buildWifiPayload({
            ssid: wifiSsid,
            password: wifiPassword,
            encryption: wifiEncryption,
            hidden: wifiHidden
          });
        case "vcard":
          return buildVCardPayload({
            name: vcardName,
            phone: vcardPhone,
            email: vcardEmail,
            organization: vcardOrg,
            title: vcardTitle
          });
        case "email":
          return buildEmailPayload({
            to: emailTo,
            subject: emailSubject,
            body: emailBody
          });
        case "sms":
          return buildSmsPayload({
            phone: smsPhone,
            message: smsMessage
          });
        default:
          return "";
      }
    } catch (e) {
      console.error("페이로드 생성 중 오류:", e);
      return "";
    }
  }, [
    inputType,
    rawText,
    wifiSsid,
    wifiPassword,
    wifiEncryption,
    wifiHidden,
    vcardName,
    vcardPhone,
    vcardEmail,
    vcardOrg,
    vcardTitle,
    emailTo,
    emailSubject,
    emailBody,
    smsPhone,
    smsMessage
  ]);

  // 화면 표시 및 캔버스 렌더링에 사용할 유효 텍스트 (입력값이 없으면 빈 상태 유지)
  const isQrAvailable = Boolean(finalPayload && finalPayload.trim().length > 0);
  const displayPayload = isQrAvailable ? finalPayload.trim() : "";

  // 명도 대비 계산
  const contrastRatio = useMemo(() => {
    if (isTransparentBg) return 21;
    return getContrastRatio(fgColor, bgColor);
  }, [fgColor, bgColor, isTransparentBg]);

  // 로고가 추가되면 권장 복원율을 자동으로 Q(25%) 이상으로 상향
  useEffect(() => {
    if (logoDataUrl && errorCorrectionPercent < 25) {
      setErrorCorrectionPercent(25); // Q(25%) 단계로 자동 상향
    }
  }, [logoDataUrl, errorCorrectionPercent]);

  // 4. 캔버스 렌더링 동기화
  const renderCurrentQr = useCallback(async () => {
    if (!canvasRef.current) return;

    // 입력 값이 없는 경우 캔버스를 깨끗하게 비우고 종료
    if (!isQrAvailable) {
      const ctx = canvasRef.current.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
      if (miniCanvasRef.current) {
        const miniCtx = miniCanvasRef.current.getContext("2d");
        if (miniCtx) {
          miniCtx.clearRect(0, 0, miniCanvasRef.current.width, miniCanvasRef.current.height);
        }
      }
      setIsRendering(false);
      return;
    }

    setIsRendering(true);
    try {
      const activeBg = isTransparentBg ? "transparent" : bgColor;

      // 메인 뷰어 캔버스
      await renderQrCodeToCanvas(canvasRef.current, {
        text: displayPayload,
        errorCorrectionLevel: errorCorrection,
        dotRadius,
        finderRadius,
        fgColor,
        fgColor2,
        useFgGradient,
        bgColor: activeBg,
        bgColor2,
        useBgGradient,
        margin,
        size: 800,
        logoDataUrl,
        logoSizePercent
      });

      // 상단 미니 위젯 캔버스
      if (miniCanvasRef.current) {
        await renderQrCodeToCanvas(miniCanvasRef.current, {
          text: displayPayload,
          errorCorrectionLevel: "L",
          dotRadius: 0,
          finderRadius: 0,
          fgColor: "#ffffff",
          bgColor: "transparent",
          margin: 1,
          size: 64,
          logoDataUrl: null
        });
      }
    } catch (err) {
      console.error("QR 캔버스 렌더링 오류:", err);
    } finally {
      setIsRendering(false);
    }
  }, [
    isQrAvailable,
    displayPayload,
    errorCorrection,
    dotRadius,
    finderRadius,
    fgColor,
    fgColor2,
    useFgGradient,
    bgColor,
    bgColor2,
    useBgGradient,
    isTransparentBg,
    margin,
    logoDataUrl,
    logoSizePercent
  ]);

  useEffect(() => {
    const timer = setTimeout(() => {
      renderCurrentQr();
    }, 50);
    return () => clearTimeout(timer);
  }, [renderCurrentQr]);

  // 5. 로고 파일 업로드 핸들러
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setLogoDataUrl(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("로고 파일 로드 오류:", err);
    }
  };

  // 공통 다운로드 앵커 유틸
  const triggerDownload = (url: string, filename: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // 6. PNG 다운로드
  const handleDownloadPng = async () => {
    try {
      if (!isQrAvailable) return;
      const exportCanvas = document.createElement("canvas");
      const activeBg = isTransparentBg ? "transparent" : bgColor;

      await renderQrCodeToCanvas(exportCanvas, {
        text: displayPayload,
        errorCorrectionLevel: errorCorrection,
        dotRadius,
        finderRadius,
        fgColor,
        fgColor2,
        useFgGradient,
        bgColor: activeBg,
        bgColor2,
        useBgGradient,
        margin,
        size: exportSize,
        logoDataUrl,
        logoSizePercent
      });

      const url = exportCanvas.toDataURL("image/png");
      triggerDownload(url, `qrcode_${exportSize}px.png`);
      setIsDownloadMenuOpen(false);
    } catch (err) {
      console.error("PNG 다운로드 실패:", err);
    }
  };

  // 7. SVG 벡터 다운로드 (전체 userSpaceOnUse 그라데이션 정상 적용)
  const handleDownloadSvg = async () => {
    try {
      if (!isQrAvailable) return;
      const activeBg = isTransparentBg ? "transparent" : bgColor;
      const svgStr = await generateQrSvgString({
        text: displayPayload,
        errorCorrectionLevel: errorCorrection,
        dotRadius,
        finderRadius,
        fgColor,
        fgColor2,
        useFgGradient,
        bgColor: activeBg,
        bgColor2,
        useBgGradient,
        margin
      });

      const blob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      triggerDownload(url, `qrcode.svg`);
      URL.revokeObjectURL(url);
      setIsDownloadMenuOpen(false);
    } catch (err) {
      console.error("SVG 다운로드 실패:", err);
    }
  };

  // 8. JPEG 다운로드 (투명 미지원 시 가드)
  const handleDownloadJpeg = async () => {
    try {
      if (!isQrAvailable || isTransparentBg) return;
      const exportCanvas = document.createElement("canvas");

      await renderQrCodeToCanvas(exportCanvas, {
        text: displayPayload,
        errorCorrectionLevel: errorCorrection,
        dotRadius,
        finderRadius,
        fgColor,
        fgColor2,
        useFgGradient,
        bgColor,
        bgColor2,
        useBgGradient,
        margin,
        size: exportSize,
        logoDataUrl,
        logoSizePercent
      });

      const url = exportCanvas.toDataURL("image/jpeg", 0.92);
      triggerDownload(url, `qrcode_${exportSize}px.jpg`);
      setIsDownloadMenuOpen(false);
    } catch (err) {
      console.error("JPEG 다운로드 실패:", err);
    }
  };

  // 9. WEBP 다운로드 (투명 지원)
  const handleDownloadWebp = async () => {
    try {
      if (!isQrAvailable) return;
      const exportCanvas = document.createElement("canvas");
      const activeBg = isTransparentBg ? "transparent" : bgColor;

      await renderQrCodeToCanvas(exportCanvas, {
        text: displayPayload,
        errorCorrectionLevel: errorCorrection,
        dotRadius,
        finderRadius,
        fgColor,
        fgColor2,
        useFgGradient,
        bgColor: activeBg,
        bgColor2,
        useBgGradient,
        margin,
        size: exportSize,
        logoDataUrl,
        logoSizePercent
      });

      const url = exportCanvas.toDataURL("image/webp", 0.95);
      triggerDownload(url, `qrcode_${exportSize}px.webp`);
      setIsDownloadMenuOpen(false);
    } catch (err) {
      console.error("WEBP 다운로드 실패:", err);
    }
  };

  // 10. 클립보드에 이미지 복사 (캔버스 호버 오버레이 클릭 시 실행)
  const handleCopyImage = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!isQrAvailable) return;
    try {
      if (!canvasRef.current) return;
      canvasRef.current.toBlob(async (blob) => {
        if (!blob) return;
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ "image/png": blob })
          ]);
          setCopiedType("img");
          setTimeout(() => setCopiedType(null), 2200);
        } catch (err) {
          console.error("클립보드 이미지 복사 권한 오류:", err);
        }
      }, "image/png");
    } catch (err) {
      console.error("이미지 복사 실패:", err);
    }
  };

  // 11. 페이로드 텍스트 복사
  const handleCopyText = async () => {
    try {
      if (!finalPayload) return;
      await navigator.clipboard.writeText(finalPayload);
      setCopiedType("text");
      setTimeout(() => setCopiedType(null), 2000);
    } catch (err) {
      console.error("텍스트 복사 실패:", err);
    }
  };

  // 12. 상단 미니 위젯 렌더링
  const miniWidgetContent = (
    <div style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", justifyContent: "space-between" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flex: 1 }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 6,
            background: "rgba(255,255,255,0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            overflow: "hidden"
          }}
        >
          {isQrAvailable ? (
            <canvas ref={miniCanvasRef} style={{ width: 28, height: 28 }} />
          ) : (
            <QrCode size={18} color="#666" />
          )}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: "0.78rem", color: "#888", display: "flex", alignItems: "center", gap: 4 }}>
            <span>QR 코드 실시간 생성기</span>
            <span style={{ color: "#0395FC" }}>({inputType.toUpperCase()})</span>
          </div>
          <div
            style={{
              fontSize: "0.85rem",
              fontWeight: 500,
              color: isQrAvailable ? "#f0f0f0" : "#777",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis"
            }}
          >
            {isQrAvailable ? finalPayload : "내용을 입력해주세요"}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
        <button
          onClick={isQrAvailable ? handleDownloadPng : undefined}
          disabled={!isQrAvailable}
          className="btn-glass"
          style={{
            padding: "5px 12px",
            fontSize: "0.75rem",
            display: "flex",
            alignItems: "center",
            gap: 4,
            background: isQrAvailable ? "rgba(1, 74, 255, 0.2)" : "rgba(255, 255, 255, 0.04)",
            border: isQrAvailable ? "1px solid rgba(1, 74, 255, 0.4)" : "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: 6,
            color: isQrAvailable ? "#0395FC" : "#666",
            fontWeight: 600,
            cursor: isQrAvailable ? "pointer" : "not-allowed",
            opacity: isQrAvailable ? 1 : 0.45
          }}
        >
          <Download size={12} />
          <span>PNG 저장</span>
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
        toolName="QR 코드 생성기"
        categoryName="도구"
        categoryPath="/tools"
        onNavigate={onNavigate}
        miniWidgetContent={miniWidgetContent}
      />

      <aside className="post-sidebar post-sidebar-left"></aside>

      <div className="post-detail-container" style={{ maxWidth: 1100, width: "100%", paddingBottom: 120 }}>
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
              <QrCode size={24} stroke="url(#toolIconGradient)" />
            </div>
            <div>
              <h1 style={{ fontSize: "1.75rem", fontWeight: 700, margin: 0, letterSpacing: "-0.03em" }}>
                QR 코드 생성기
              </h1>
              <p style={{ fontSize: "0.92rem", color: "#888", margin: 0, marginTop: 4 }}>
                브라우저에서 직접 생성하는 고화질 벡터 및 로고 QR 코드
              </p>
            </div>
          </div>
        </div>

        {/* 4. 메인 2열 레이아웃: 좌측 설정 및 입력 / 우측 실시간 프리뷰 및 다운로드 */}
        <div className="qr-generator-grid">
          {/* 좌측 패널: 데이터 입력 & 스타일 커스터마이징 */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* 포맷 탭 선택 바 */}
            <div
              style={{
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: 14,
                padding: 6,
                display: "grid",
                gridTemplateColumns: "repeat(5, 1fr)",
                gap: 4
              }}
            >
              {(
                [
                  { id: "text", label: "URL", icon: Link },
                  { id: "wifi", label: "Wi-Fi", icon: Wifi },
                  { id: "vcard", label: "연락처", icon: User },
                  { id: "email", label: "이메일", icon: Mail },
                  { id: "sms", label: "문자", icon: MessageSquare }
                ] as const
              ).map((tab) => {
                const IconComponent = tab.icon;
                const isActive = inputType === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setInputType(tab.id)}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 4,
                      padding: "8px 4px",
                      height: 56,
                      minHeight: 56,
                      boxSizing: "border-box",
                      borderRadius: 10,
                      background: isActive ? "rgba(1, 74, 255, 0.15)" : "transparent",
                      border: isActive ? "1px solid rgba(1, 74, 255, 0.3)" : "1px solid transparent",
                      color: isActive ? "#0395FC" : "#888",
                      cursor: "pointer",
                      fontSize: "0.78rem",
                      fontWeight: isActive ? 600 : 400,
                      lineHeight: 1.2,
                      transition: "background 0.15s, border-color 0.15s, color 0.15s"
                    }}
                  >
                    <IconComponent size={16} />
                    <span style={{ whiteSpace: "nowrap", lineHeight: 1 }}>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* 입력 폼 필드 카드 (모든 탭에서 균일한 292px 높이 유지) */}
            <div
              style={{
                background: "rgba(255, 255, 255, 0.02)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: 16,
                padding: 20,
                minHeight: 292,
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-start",
                boxSizing: "border-box"
              }}
            >
              {/* URL / 일반 텍스트 모드 */}
              {inputType === "text" && (
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", color: "#aaa", marginBottom: 8 }}>
                    웹사이트 주소 또는 일반 텍스트
                  </label>
                  <textarea
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    rows={4}
                    placeholder="https://example.com 또는 텍스트를 입력하세요"
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      background: "rgba(0,0,0,0.5)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 10,
                      color: "#fff",
                      fontSize: "0.92rem",
                      resize: "vertical",
                      boxSizing: "border-box",
                      outline: "none"
                    }}
                  />
                </div>
              )}

              {/* Wi-Fi 모드 */}
              {inputType === "wifi" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", color: "#aaa", marginBottom: 6 }}>
                      네트워크 이름 (SSID) *
                    </label>
                    <input
                      type="text"
                      value={wifiSsid}
                      onChange={(e) => setWifiSsid(e.target.value)}
                      placeholder="예: MyCafe_Wi-Fi"
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        background: "rgba(0,0,0,0.5)",
                        border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: 8,
                        color: "#fff",
                        boxSizing: "border-box"
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", color: "#aaa", marginBottom: 6 }}>
                      보안 암호
                    </label>
                    <input
                      type="text"
                      value={wifiPassword}
                      onChange={(e) => setWifiPassword(e.target.value)}
                      placeholder="비밀번호가 없으면 비워두세요"
                      disabled={wifiEncryption === "nopass"}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        background: "rgba(0,0,0,0.5)",
                        border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: 8,
                        color: "#fff",
                        boxSizing: "border-box",
                        opacity: wifiEncryption === "nopass" ? 0.4 : 1
                      }}
                    />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <label style={{ display: "block", fontSize: "0.85rem", color: "#aaa", marginBottom: 6 }}>
                        보안 방식
                      </label>
                      <select
                        value={wifiEncryption}
                        onChange={(e) => setWifiEncryption(e.target.value as any)}
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          background: "#161616",
                          border: "1px solid rgba(255,255,255,0.12)",
                          borderRadius: 8,
                          color: "#fff"
                        }}
                      >
                        <option value="WPA">WPA/WPA2/WPA3</option>
                        <option value="WEP">WEP</option>
                        <option value="nopass">개방형 (암호 없음)</option>
                      </select>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", paddingTop: 24 }}>
                      <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: "0.85rem", color: "#ccc" }}>
                        <input
                          type="checkbox"
                          checked={wifiHidden}
                          onChange={(e) => setWifiHidden(e.target.checked)}
                          style={{ accentColor: "#0395FC" }}
                        />
                        <span>비공개(히든) 네트워크</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* vCard 연락처 모드 */}
              {inputType === "vcard" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <label style={{ display: "block", fontSize: "0.85rem", color: "#aaa", marginBottom: 6 }}>이름 *</label>
                      <input
                        type="text"
                        value={vcardName}
                        onChange={(e) => setVcardName(e.target.value)}
                        placeholder="홍길동"
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          background: "rgba(0,0,0,0.5)",
                          border: "1px solid rgba(255,255,255,0.12)",
                          borderRadius: 8,
                          color: "#fff",
                          boxSizing: "border-box"
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "0.85rem", color: "#aaa", marginBottom: 6 }}>전화번호</label>
                      <input
                        type="text"
                        value={vcardPhone}
                        onChange={(e) => setVcardPhone(e.target.value)}
                        placeholder="010-0000-0000"
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          background: "rgba(0,0,0,0.5)",
                          border: "1px solid rgba(255,255,255,0.12)",
                          borderRadius: 8,
                          color: "#fff",
                          boxSizing: "border-box"
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", color: "#aaa", marginBottom: 6 }}>이메일</label>
                    <input
                      type="email"
                      value={vcardEmail}
                      onChange={(e) => setVcardEmail(e.target.value)}
                      placeholder="user@example.com"
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        background: "rgba(0,0,0,0.5)",
                        border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: 8,
                        color: "#fff",
                        boxSizing: "border-box"
                      }}
                    />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <label style={{ display: "block", fontSize: "0.85rem", color: "#aaa", marginBottom: 6 }}>회사 / 소속</label>
                      <input
                        type="text"
                        value={vcardOrg}
                        onChange={(e) => setVcardOrg(e.target.value)}
                        placeholder="소속 회사명"
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          background: "rgba(0,0,0,0.5)",
                          border: "1px solid rgba(255,255,255,0.12)",
                          borderRadius: 8,
                          color: "#fff",
                          boxSizing: "border-box"
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "0.85rem", color: "#aaa", marginBottom: 6 }}>직책</label>
                      <input
                        type="text"
                        value={vcardTitle}
                        onChange={(e) => setVcardTitle(e.target.value)}
                        placeholder="직책 및 직위"
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          background: "rgba(0,0,0,0.5)",
                          border: "1px solid rgba(255,255,255,0.12)",
                          borderRadius: 8,
                          color: "#fff",
                          boxSizing: "border-box"
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 이메일 발송 모드 */}
              {inputType === "email" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", color: "#aaa", marginBottom: 6 }}>받는 사람 (Email) *</label>
                    <input
                      type="email"
                      value={emailTo}
                      onChange={(e) => setEmailTo(e.target.value)}
                      placeholder="contact@example.com"
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        background: "rgba(0,0,0,0.5)",
                        border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: 8,
                        color: "#fff",
                        boxSizing: "border-box"
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", color: "#aaa", marginBottom: 6 }}>메일 제목</label>
                    <input
                      type="text"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      placeholder="제목 입력"
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        background: "rgba(0,0,0,0.5)",
                        border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: 8,
                        color: "#fff",
                        boxSizing: "border-box"
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", color: "#aaa", marginBottom: 6 }}>메일 본문</label>
                    <textarea
                      value={emailBody}
                      onChange={(e) => setEmailBody(e.target.value)}
                      rows={3}
                      placeholder="본문 내용 입력"
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        background: "rgba(0,0,0,0.5)",
                        border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: 8,
                        color: "#fff",
                        boxSizing: "border-box",
                        resize: "vertical"
                      }}
                    />
                  </div>
                </div>
              )}

              {/* SMS 문자 모드 */}
              {inputType === "sms" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", color: "#aaa", marginBottom: 6 }}>수신 전화번호 *</label>
                    <input
                      type="text"
                      value={smsPhone}
                      onChange={(e) => setSmsPhone(e.target.value)}
                      placeholder="010-0000-0000"
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        background: "rgba(0,0,0,0.5)",
                        border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: 8,
                        color: "#fff",
                        boxSizing: "border-box"
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", color: "#aaa", marginBottom: 6 }}>문자 메시지 내용</label>
                    <textarea
                      value={smsMessage}
                      onChange={(e) => setSmsMessage(e.target.value)}
                      rows={3}
                      placeholder="전송할 문자 내용을 입력하세요"
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        background: "rgba(0,0,0,0.5)",
                        border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: 8,
                        color: "#fff",
                        boxSizing: "border-box",
                        resize: "vertical"
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 디자인 커스터마이징 카드 */}
            <div
              style={{
                background: "rgba(255, 255, 255, 0.02)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: 16,
                padding: 20,
                display: "flex",
                flexDirection: "column",
                gap: 20
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.92rem", fontWeight: 600 }}>
                <Palette size={16} color="#0395FC" />
                <span>디자인 & 스타일 커스터마이징</span>
              </div>

              {/* 1. 도트 모양 & 세 모서리 파인더 패턴 곡률 슬라이더 */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {/* 도트 모양 (곡률 슬라이더) */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <label style={{ fontSize: "0.82rem", color: "#aaa" }}>
                      도트 모양 (패턴 곡률)
                    </label>
                    <span style={{ fontSize: "0.78rem", color: "#0395FC", fontWeight: 600 }}>
                      {dotRadius === 0 ? "0% (직각 사각형)" : dotRadius === 100 ? "100% (완전 원형)" : `${dotRadius}% (둥근 모서리)`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={dotRadius}
                    onChange={(e) => setDotRadius(Number(e.target.value))}
                    style={{ width: "100%", accentColor: "#014AFF", cursor: "pointer" }}
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "#666", marginTop: 2 }}>
                    <span>사각형 (0%)</span>
                    <span>부드럽게 (50%)</span>
                    <span>원형 (100%)</span>
                  </div>
                </div>

                {/* 파인더 패턴 (곡률 슬라이더) */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <label style={{ fontSize: "0.82rem", color: "#aaa" }}>
                      세 모서리 위치 찾기 패턴 (Finder 곡률)
                    </label>
                    <span style={{ fontSize: "0.78rem", color: "#0395FC", fontWeight: 600 }}>
                      {finderRadius === 0 ? "0% (직각 사각형)" : finderRadius === 100 ? "100% (원형 링)" : `${finderRadius}% (라운드)`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={finderRadius}
                    onChange={(e) => setFinderRadius(Number(e.target.value))}
                    style={{ width: "100%", accentColor: "#014AFF", cursor: "pointer" }}
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "#666", marginTop: 2 }}>
                    <span>사각형 (0%)</span>
                    <span>부드럽게 (50%)</span>
                    <span>원형 (100%)</span>
                  </div>
                </div>

                {/* 오류 복원율 슬라이더 (7% ~ 30% 세부 조절) */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <label style={{ fontSize: "0.82rem", color: "#aaa" }}>
                      오류 복원율 (세부 조절)
                    </label>
                    <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "#0395FC" }}>
                      {errorCorrectionPercent}% ({errorCorrectionInfo.level} 레벨) - {errorCorrectionInfo.tag}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={7}
                    max={30}
                    step={1}
                    value={errorCorrectionPercent}
                    onChange={(e) => setErrorCorrectionPercent(Number(e.target.value))}
                    style={{ width: "100%", accentColor: "#014AFF", cursor: "pointer" }}
                  />
                  <div
                    style={{
                      marginTop: 8,
                      padding: "8px 12px",
                      borderRadius: 8,
                      background: "rgba(255, 255, 255, 0.03)",
                      border: "1px solid rgba(255, 255, 255, 0.06)",
                      fontSize: "0.78rem",
                      color: "#aaa"
                    }}
                  >
                    💡 {errorCorrectionInfo.desc}
                  </div>
                </div>
              </div>

              {/* 2. 전경색 & 배경색 포토샵 스타일 그라디언트 에디터 */}
              <div style={{ borderTop: "1px solid rgba(255, 255, 255, 0.08)", paddingTop: 18, display: "flex", flexDirection: "column", gap: 16 }}>
                {/* 전경색 에디터 */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#ccc" }}>전경색 (QR 코드 색상)</span>
                    <button
                      type="button"
                      onClick={() => setUseFgGradient(!useFgGradient)}
                      style={{
                        padding: "3px 8px",
                        borderRadius: 6,
                        fontSize: "0.75rem",
                        background: useFgGradient ? "rgba(1, 74, 255, 0.2)" : "rgba(255,255,255,0.06)",
                        border: useFgGradient ? "1px solid rgba(1, 74, 255, 0.4)" : "1px solid transparent",
                        color: useFgGradient ? "#0395FC" : "#888",
                        cursor: "pointer",
                        fontWeight: useFgGradient ? 600 : 400,
                        transition: "all 0.15s"
                      }}
                    >
                      그라데이션 {useFgGradient ? "ON" : "OFF"}
                    </button>
                  </div>

                  {/* 포토샵 스타일 그라디언트 밴드 미리보기 바 */}
                  <div
                    style={{
                      height: 22,
                      borderRadius: 6,
                      background: useFgGradient
                        ? `linear-gradient(to right, ${fgColor}, ${fgColor2})`
                        : fgColor,
                      border: "1px solid rgba(255, 255, 255, 0.16)",
                      marginBottom: 8,
                      boxShadow: "inset 0 1px 3px rgba(0, 0, 0, 0.5)"
                    }}
                  />

                  {/* 시작색 & 끝색 스와치 컨트롤러 */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    {/* 시작 색상 */}
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1 }}>
                      <input
                        type="color"
                        value={fgColor}
                        onChange={(e) => setFgColor(e.target.value)}
                        style={{ width: 32, height: 32, border: "none", background: "none", cursor: "pointer", padding: 0 }}
                      />
                      <input
                        type="text"
                        value={fgColor}
                        onChange={(e) => setFgColor(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "6px 8px",
                          background: "rgba(0,0,0,0.4)",
                          border: "1px solid rgba(255,255,255,0.12)",
                          borderRadius: 6,
                          color: "#fff",
                          fontSize: "0.8rem"
                        }}
                      />
                    </div>

                    {/* 색상 맞바꾸기(Swap) 버튼 */}
                    {useFgGradient && (
                      <button
                        type="button"
                        onClick={() => {
                          const tmp = fgColor;
                          setFgColor(fgColor2);
                          setFgColor2(tmp);
                        }}
                        style={{
                          background: "rgba(255,255,255,0.06)",
                          border: "1px solid rgba(255,255,255,0.12)",
                          borderRadius: 6,
                          width: 30,
                          height: 30,
                          color: "#aaa",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0
                        }}
                        title="색상 순서 반전"
                      >
                        <ArrowLeftRight size={13} />
                      </button>
                    )}

                    {/* 끝 색상 (그라데이션 ON일 때) */}
                    {useFgGradient && (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1 }}>
                        <input
                          type="color"
                          value={fgColor2}
                          onChange={(e) => setFgColor2(e.target.value)}
                          style={{ width: 32, height: 32, border: "none", background: "none", cursor: "pointer", padding: 0 }}
                        />
                        <input
                          type="text"
                          value={fgColor2}
                          onChange={(e) => setFgColor2(e.target.value)}
                          style={{
                            width: "100%",
                            padding: "6px 8px",
                            background: "rgba(0,0,0,0.4)",
                            border: "1px solid rgba(255,255,255,0.12)",
                            borderRadius: 6,
                            color: "#fff",
                            fontSize: "0.8rem"
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* 배경색 에디터 & 투명 배경 토글 */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#ccc" }}>배경색</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {/* 배경 투명화 토글 버튼 */}
                      <button
                        type="button"
                        onClick={() => {
                          const next = !isTransparentBg;
                          setIsTransparentBg(next);
                          if (next) setUseBgGradient(false);
                        }}
                        style={{
                          padding: "3px 8px",
                          borderRadius: 6,
                          fontSize: "0.75rem",
                          background: isTransparentBg ? "rgba(1, 74, 255, 0.2)" : "rgba(255,255,255,0.06)",
                          border: isTransparentBg ? "1px solid rgba(1, 74, 255, 0.4)" : "1px solid transparent",
                          color: isTransparentBg ? "#0395FC" : "#888",
                          cursor: "pointer",
                          fontWeight: isTransparentBg ? 600 : 400,
                          transition: "all 0.15s"
                        }}
                      >
                        투명 배경 {isTransparentBg ? "ON" : "OFF"}
                      </button>

                      {/* 배경 그라데이션 토글 */}
                      {!isTransparentBg && (
                        <button
                          type="button"
                          onClick={() => setUseBgGradient(!useBgGradient)}
                          style={{
                            padding: "3px 8px",
                            borderRadius: 6,
                            fontSize: "0.75rem",
                            background: useBgGradient ? "rgba(1, 74, 255, 0.2)" : "rgba(255,255,255,0.06)",
                            border: useBgGradient ? "1px solid rgba(1, 74, 255, 0.4)" : "1px solid transparent",
                            color: useBgGradient ? "#0395FC" : "#888",
                            cursor: "pointer",
                            fontWeight: useBgGradient ? 600 : 400,
                            transition: "all 0.15s"
                          }}
                        >
                          그라데이션 {useBgGradient ? "ON" : "OFF"}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 포토샵 스타일 배경 프리뷰 밴드 바 */}
                  <div
                    style={{
                      height: 22,
                      borderRadius: 6,
                      background: isTransparentBg
                        ? "repeating-conic-gradient(#333 0% 25%, #222 0% 50%) 50% / 12px 12px"
                        : useBgGradient
                          ? `linear-gradient(to right, ${bgColor}, ${bgColor2})`
                          : bgColor,
                      border: "1px solid rgba(255, 255, 255, 0.16)",
                      marginBottom: 8,
                      boxShadow: "inset 0 1px 3px rgba(0, 0, 0, 0.5)",
                      opacity: isTransparentBg ? 0.75 : 1
                    }}
                  />

                  {/* 배경색 컨트롤러 (투명 시 딤드) */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                      opacity: isTransparentBg ? 0.35 : 1,
                      pointerEvents: isTransparentBg ? "none" : "auto"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1 }}>
                      <input
                        type="color"
                        value={bgColor}
                        onChange={(e) => setBgColor(e.target.value)}
                        disabled={isTransparentBg}
                        style={{ width: 32, height: 32, border: "none", background: "none", cursor: "pointer", padding: 0 }}
                      />
                      <input
                        type="text"
                        value={bgColor}
                        onChange={(e) => setBgColor(e.target.value)}
                        disabled={isTransparentBg}
                        style={{
                          width: "100%",
                          padding: "6px 8px",
                          background: "rgba(0,0,0,0.4)",
                          border: "1px solid rgba(255,255,255,0.12)",
                          borderRadius: 6,
                          color: "#fff",
                          fontSize: "0.8rem"
                        }}
                      />
                    </div>

                    {useBgGradient && !isTransparentBg && (
                      <button
                        type="button"
                        onClick={() => {
                          const tmp = bgColor;
                          setBgColor(bgColor2);
                          setBgColor2(tmp);
                        }}
                        style={{
                          background: "rgba(255,255,255,0.06)",
                          border: "1px solid rgba(255,255,255,0.12)",
                          borderRadius: 6,
                          width: 30,
                          height: 30,
                          color: "#aaa",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0
                        }}
                        title="색상 순서 반전"
                      >
                        <ArrowLeftRight size={13} />
                      </button>
                    )}

                    {useBgGradient && !isTransparentBg && (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1 }}>
                        <input
                          type="color"
                          value={bgColor2}
                          onChange={(e) => setBgColor2(e.target.value)}
                          style={{ width: 32, height: 32, border: "none", background: "none", cursor: "pointer", padding: 0 }}
                        />
                        <input
                          type="text"
                          value={bgColor2}
                          onChange={(e) => setBgColor2(e.target.value)}
                          style={{
                            width: "100%",
                            padding: "6px 8px",
                            background: "rgba(0,0,0,0.4)",
                            border: "1px solid rgba(255,255,255,0.12)",
                            borderRadius: 6,
                            color: "#fff",
                            fontSize: "0.8rem"
                          }}
                        />
                      </div>
                    )}
                  </div>

                  {contrastRatio < 3 && !isTransparentBg && (
                    <div
                      style={{
                        marginTop: 10,
                        padding: "8px 12px",
                        borderRadius: 8,
                        background: "rgba(234, 179, 8, 0.1)",
                        border: "1px solid rgba(234, 179, 8, 0.3)",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        fontSize: "0.8rem",
                        color: "#fbbf24"
                      }}
                    >
                      <AlertTriangle size={15} />
                      <span>명도 대비가 낮아 스캔 인식이 어려울 수 있습니다 (대비: {contrastRatio.toFixed(1)}:1)</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 3. 여백 및 중앙 로고 삽입 */}
              <div style={{ borderTop: "1px solid rgba(255, 255, 255, 0.08)", paddingTop: 18, display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <label style={{ fontSize: "0.82rem", color: "#aaa" }}>외곽 여백 (Quiet Zone)</label>
                    <span style={{ fontSize: "0.78rem", color: "#0395FC", fontWeight: 600 }}>{margin}칸</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={6}
                    value={margin}
                    onChange={(e) => setMargin(Number(e.target.value))}
                    style={{ width: "100%", accentColor: "#014AFF", cursor: "pointer" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.82rem", color: "#aaa", marginBottom: 8 }}>
                    중앙 로고 삽입
                  </label>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <label
                      style={{
                        padding: "8px 14px",
                        borderRadius: 8,
                        background: "rgba(255, 255, 255, 0.06)",
                        border: "1px solid rgba(255, 255, 255, 0.12)",
                        color: "#eee",
                        fontSize: "0.82rem",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6
                      }}
                    >
                      <ImageIcon size={14} />
                      <span>{logoDataUrl ? "로고 변경" : "로고 이미지 업로드"}</span>
                      <input type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: "none" }} />
                    </label>

                    {logoDataUrl && (
                      <button
                        type="button"
                        onClick={() => setLogoDataUrl(null)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#f87171",
                          fontSize: "0.8rem",
                          cursor: "pointer",
                          padding: "6px"
                        }}
                      >
                        로고 삭제
                      </button>
                    )}
                  </div>

                  {logoDataUrl && (
                    <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ fontSize: "0.78rem", color: "#888" }}>로고 크기: {logoSizePercent}%</span>
                      <input
                        type="range"
                        min={12}
                        max={28}
                        value={logoSizePercent}
                        onChange={(e) => setLogoSizePercent(Number(e.target.value))}
                        style={{ flex: 1, accentColor: "#0395FC" }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 우측 패널: 실시간 프리뷰 캔버스 & 다운로드/호버 복사 */}
          <div className="qr-generator-preview-sticky" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div
              style={{
                background: "rgba(255, 255, 255, 0.02)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: 20,
                padding: "24px 16px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                position: "relative"
              }}
            >
              {/* 캔버스 디스플레이 컨테이너 (호버 시 클립보드 복사 오버레이 노출) */}
              <div
                onMouseEnter={() => {
                  if (isQrAvailable) setIsCanvasHovered(true);
                }}
                onMouseLeave={() => setIsCanvasHovered(false)}
                onClick={isQrAvailable ? handleCopyImage : undefined}
                style={{
                  width: "100%",
                  maxWidth: 280,
                  aspectRatio: "1 / 1",
                  borderRadius: 16,
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: isQrAvailable ? "0 16px 36px rgba(0, 0, 0, 0.4)" : "none",
                  background: isQrAvailable
                    ? (isTransparentBg
                        ? "repeating-conic-gradient(#222 0% 25%, #141414 0% 50%) 50% / 16px 16px"
                        : bgColor)
                    : "rgba(255, 255, 255, 0.02)",
                  border: isQrAvailable
                    ? "1px solid rgba(255, 255, 255, 0.1)"
                    : "1px dashed rgba(255, 255, 255, 0.12)",
                  margin: "12px 0 20px",
                  position: "relative",
                  cursor: isQrAvailable ? "pointer" : "default",
                  userSelect: "none"
                }}
                title={isQrAvailable ? "클릭하여 클립보드에 이미지 복사" : undefined}
              >
                <canvas
                  ref={canvasRef}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    display: isQrAvailable ? "block" : "none"
                  }}
                />

                {/* 빈 공간 안내 상태 (생성된 QR이 없을 때) */}
                {!isQrAvailable && (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 10,
                      color: "rgba(255, 255, 255, 0.25)",
                      padding: 16,
                      textAlign: "center"
                    }}
                  >
                    <QrCode size={40} strokeWidth={1.2} style={{ opacity: 0.35 }} />
                    <span style={{ fontSize: "0.82rem", color: "#666" }}>
                      내용을 입력하면 QR 코드가 생성됩니다
                    </span>
                  </div>
                )}

                {/* 마우스 호버 시 복사 아이콘 오버레이 (QR이 생성되어 있을 때만 활성화) */}
                {isQrAvailable && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: "rgba(0, 0, 0, 0.55)",
                      backdropFilter: "blur(2px)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      opacity: isCanvasHovered ? 1 : 0,
                      pointerEvents: isCanvasHovered ? "auto" : "none",
                      transition: "opacity 0.2s ease",
                      color: "#ffffff"
                    }}
                  >
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: "50%",
                        background: copiedType === "img" ? "rgba(52, 211, 153, 0.3)" : "rgba(1, 74, 255, 0.3)",
                        border: copiedType === "img" ? "1px solid #34d399" : "1px solid rgba(1, 74, 255, 0.6)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.4)",
                        transform: isCanvasHovered ? "scale(1)" : "scale(0.85)",
                        transition: "transform 0.2s ease"
                      }}
                    >
                      {copiedType === "img" ? <Check size={22} color="#34d399" /> : <Copy size={20} color="#ffffff" />}
                    </div>
                    <span style={{ fontSize: "0.82rem", fontWeight: 600, letterSpacing: "-0.01em" }}>
                      {copiedType === "img" ? "클립보드에 복사됨!" : "클릭하여 이미지 복사"}
                    </span>
                  </div>
                )}
              </div>

              {/* 생성된 텍스트 요약 미리보기 */}
              <div
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: 10,
                  background: "rgba(0,0,0,0.4)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  fontSize: "0.82rem",
                  color: isQrAvailable ? "#bbb" : "#666",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 20,
                  gap: 8
                }}
              >
                <span
                  style={{
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis"
                  }}
                >
                  {isQrAvailable ? finalPayload : "(내용을 입력하면 여기에 표시됩니다)"}
                </span>
                {isQrAvailable && (
                  <button
                    onClick={handleCopyText}
                    style={{
                      background: "none",
                      border: "none",
                      color: copiedType === "text" ? "#0395FC" : "#888",
                      cursor: "pointer",
                      padding: 4,
                      display: "flex",
                      alignItems: "center",
                      flexShrink: 0
                    }}
                    title="데이터 텍스트 복사"
                  >
                    {copiedType === "text" ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                )}
              </div>

              {/* 다운로드 해상도 슬라이더 (256px ~ 2048px) */}
              <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: "0.82rem", color: "#888" }}>다운로드 해상도</span>
                    <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#0395FC" }}>
                      {exportSize} × {exportSize} px
                    </span>
                  </div>
                  <input
                    type="range"
                    min={256}
                    max={2048}
                    step={64}
                    value={exportSize}
                    onChange={(e) => setExportSize(Number(e.target.value))}
                    style={{ width: "100%", accentColor: "#014AFF", cursor: "pointer" }}
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 4, marginTop: 4 }}>
                    {[256, 512, 1024, 2048].map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setExportSize(size)}
                        style={{
                          padding: "2px 8px",
                          borderRadius: 4,
                          fontSize: "0.72rem",
                          background: exportSize === size ? "rgba(1, 74, 255, 0.2)" : "rgba(255,255,255,0.04)",
                          border: exportSize === size ? "1px solid rgba(1, 74, 255, 0.4)" : "1px solid transparent",
                          color: exportSize === size ? "#0395FC" : "#777",
                          cursor: "pointer"
                        }}
                      >
                        {size}px
                      </button>
                    ))}
                  </div>
                </div>

                {/* 통합 다운로드 버튼 & 드롭다운 메뉴 (PNG, SVG, WEBP, JPEG) */}
                <div ref={downloadDropdownRef} style={{ position: "relative", width: "100%" }}>
                  <button
                    type="button"
                    disabled={!isQrAvailable}
                    onClick={() => isQrAvailable && setIsDownloadMenuOpen(!isDownloadMenuOpen)}
                    style={{
                      width: "100%",
                      padding: "13px 18px",
                      borderRadius: 12,
                      background: isQrAvailable ? "rgba(1, 74, 255, 0.22)" : "rgba(255, 255, 255, 0.04)",
                      border: isQrAvailable ? "1px solid rgba(1, 74, 255, 0.45)" : "1px solid rgba(255, 255, 255, 0.08)",
                      color: isQrAvailable ? "#0395FC" : "#666",
                      fontWeight: 600,
                      fontSize: "0.95rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      cursor: isQrAvailable ? "pointer" : "not-allowed",
                      opacity: isQrAvailable ? 1 : 0.45,
                      boxShadow: isQrAvailable ? "0 4px 16px rgba(1, 74, 255, 0.15)" : "none",
                      transition: "all 0.15s"
                    }}
                    title={!isQrAvailable ? "내용을 입력하면 다운로드할 수 있습니다" : undefined}
                  >
                    <Download size={18} />
                    <span>QR 코드 다운로드</span>
                    <ChevronDown
                      size={16}
                      style={{
                        transform: isDownloadMenuOpen ? "rotate(180deg)" : "rotate(0deg)",
                        transition: "transform 0.2s"
                      }}
                    />
                  </button>

                  {/* 드롭다운 포맷 선택 메뉴 */}
                  <AnimatePresence>
                    {isQrAvailable && isDownloadMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -6, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.98 }}
                        transition={{ duration: 0.15 }}
                        style={{
                          position: "absolute",
                          bottom: "calc(100% + 8px)",
                          left: 0,
                          right: 0,
                          background: "#161618",
                          border: "1px solid rgba(255, 255, 255, 0.12)",
                          borderRadius: 12,
                          padding: 6,
                          display: "flex",
                          flexDirection: "column",
                          gap: 4,
                          boxShadow: "0 12px 32px rgba(0, 0, 0, 0.6)",
                          zIndex: 50
                        }}
                      >
                        {/* 1. PNG */}
                        <button
                          type="button"
                          onClick={handleDownloadPng}
                          style={{
                            width: "100%",
                            padding: "10px 12px",
                            background: "transparent",
                            border: "none",
                            borderRadius: 8,
                            color: "#fff",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            textAlign: "left",
                            transition: "background 0.15s"
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        >
                          <div style={{ display: "flex", flexDirection: "column" }}>
                            <span style={{ fontSize: "0.88rem", fontWeight: 600 }}>PNG 이미지 (.png)</span>
                            <span style={{ fontSize: "0.75rem", color: "#888" }}>고화질 래스터 그래픽 (투명 배경 지원)</span>
                          </div>
                          <span style={{ fontSize: "0.75rem", color: "#0395FC", fontWeight: 600 }}>
                            {exportSize}px
                          </span>
                        </button>

                        {/* 2. SVG (완전 수정된 글로벌 그라데이션) */}
                        <button
                          type="button"
                          onClick={handleDownloadSvg}
                          style={{
                            width: "100%",
                            padding: "10px 12px",
                            background: "transparent",
                            border: "none",
                            borderRadius: 8,
                            color: "#fff",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            textAlign: "left",
                            transition: "background 0.15s"
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        >
                          <div style={{ display: "flex", flexDirection: "column" }}>
                            <span style={{ fontSize: "0.88rem", fontWeight: 600 }}>SVG 벡터 (.svg)</span>
                            <span style={{ fontSize: "0.75rem", color: "#888" }}>무손실 확대/축소 및 웹 벡터 그래픽</span>
                          </div>
                          <span style={{ fontSize: "0.75rem", color: "#34d399", fontWeight: 600 }}>
                            Vector
                          </span>
                        </button>

                        {/* 3. WEBP */}
                        <button
                          type="button"
                          onClick={handleDownloadWebp}
                          style={{
                            width: "100%",
                            padding: "10px 12px",
                            background: "transparent",
                            border: "none",
                            borderRadius: 8,
                            color: "#fff",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            textAlign: "left",
                            transition: "background 0.15s"
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        >
                          <div style={{ display: "flex", flexDirection: "column" }}>
                            <span style={{ fontSize: "0.88rem", fontWeight: 600 }}>WEBP 포맷 (.webp)</span>
                            <span style={{ fontSize: "0.75rem", color: "#888" }}>초경량 웹 이미지 (투명 배경 지원)</span>
                          </div>
                          <span style={{ fontSize: "0.75rem", color: "#a855f7", fontWeight: 600 }}>
                            WebP
                          </span>
                        </button>

                        {/* 4. JPEG (투명일 경우 비활성화) */}
                        <button
                          type="button"
                          onClick={handleDownloadJpeg}
                          disabled={isTransparentBg}
                          style={{
                            width: "100%",
                            padding: "10px 12px",
                            background: "transparent",
                            border: "none",
                            borderRadius: 8,
                            color: isTransparentBg ? "#555" : "#fff",
                            cursor: isTransparentBg ? "not-allowed" : "pointer",
                            opacity: isTransparentBg ? 0.45 : 1,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            textAlign: "left",
                            transition: "background 0.15s"
                          }}
                          onMouseEnter={(e) => {
                            if (!isTransparentBg) e.currentTarget.style.background = "rgba(255,255,255,0.08)";
                          }}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                          title={isTransparentBg ? "투명 배경에서는 JPEG 포맷을 사용할 수 없습니다" : "표준 압축 사진 이미지"}
                        >
                          <div style={{ display: "flex", flexDirection: "column" }}>
                            <span style={{ fontSize: "0.88rem", fontWeight: 600 }}>
                              JPEG 이미지 (.jpg)
                              {isTransparentBg && <span style={{ fontSize: "0.72rem", color: "#f87171", marginLeft: 6 }}>[투명 미지원]</span>}
                            </span>
                            <span style={{ fontSize: "0.75rem", color: isTransparentBg ? "#777" : "#888" }}>
                              {isTransparentBg ? "배경색을 설정하면 활성화됩니다" : "호환성 높은 표준 래스터 포맷"}
                            </span>
                          </div>
                          <span style={{ fontSize: "0.75rem", color: isTransparentBg ? "#555" : "#fbbf24", fontWeight: 600 }}>
                            JPEG
                          </span>
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <aside className="post-sidebar post-sidebar-right"></aside>
    </motion.div>
  );
}
