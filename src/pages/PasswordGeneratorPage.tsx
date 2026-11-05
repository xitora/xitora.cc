import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  KeyRound,
  ChevronLeft,
  Copy,
  Check,
  RefreshCw,
  Eye,
  EyeOff,
  ShieldCheck,
  Sliders,
  QrCode,
  Download,
  History,
  Trash2,
  Lock,
  Sparkles,
  Smartphone
} from "lucide-react";
import FloatingToolHeader from "../components/FloatingToolHeader";
import {
  generateRandomPassword,
  generatePassphrase,
  generatePin,
  evaluatePasswordStrength,
  type PasswordStrength
} from "../utils/passwordGenerator";
import { renderQrCodeToCanvas } from "../utils/qrGenerator";

interface PasswordGeneratorPageProps {
  onNavigate: (path: string) => void;
  currentPath?: string;
}

type GeneratorMode = "random" | "passphrase" | "pin" | "bulk";

export default function PasswordGeneratorPage({ onNavigate }: PasswordGeneratorPageProps) {
  // 1. 모드 상태
  const [mode, setMode] = useState<GeneratorMode>("random");

  // 무작위 비밀번호 옵션
  const [length, setLength] = useState(16);
  const [useUpper, setUseUpper] = useState(true);
  const [useLower, setUseLower] = useState(true);
  const [useDigits, setUseDigits] = useState(true);
  const [useSymbols, setUseSymbols] = useState(true);
  const [excludeAmbiguous, setExcludeAmbiguous] = useState(false);

  // 패스프레이즈 옵션
  const [wordCount, setWordCount] = useState(4);
  const [separator, setSeparator] = useState("-");
  const [capitalize, setCapitalize] = useState(true);
  const [includeNumber, setIncludeNumber] = useState(true);

  // PIN 옵션
  const [pinLength, setPinLength] = useState(6);

  // 대량 생성 옵션
  const [bulkCount, setBulkCount] = useState(10);
  const [bulkList, setBulkList] = useState<string[]>([]);

  // 현재 생성된 비밀번호 및 보기 상태
  const [currentPassword, setCurrentPassword] = useState("");
  const [showPassword, setShowPassword] = useState(true);
  const [isRotating, setIsRotating] = useState(false);

  // 모바일 화면 감지 상태
  const [isMobile, setIsMobile] = useState(() => (typeof window !== "undefined" ? window.innerWidth < 768 : false));

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // 히스토리 목록 (현재 세션 메모리 전용)
  const [history, setHistory] = useState<Array<{ password: string; time: string }>>([]);

  // QR 모달 상태
  const [showQrModal, setShowQrModal] = useState(false);
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // 복사 알림 키
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // 2. 비밀번호 생성 함수
  const generateNewPassword = useCallback(() => {
    setIsRotating(true);
    setTimeout(() => setIsRotating(false), 300);

    let pwd = "";
    if (mode === "random") {
      pwd = generateRandomPassword({
        length,
        useUpper,
        useLower,
        useDigits,
        useSymbols,
        excludeAmbiguous
      });
    } else if (mode === "passphrase") {
      pwd = generatePassphrase({
        wordCount,
        separator,
        capitalize,
        includeNumber
      });
    } else if (mode === "pin") {
      pwd = generatePin(pinLength);
    } else if (mode === "bulk") {
      const list: string[] = [];
      for (let i = 0; i < bulkCount; i++) {
        list.push(
          generateRandomPassword({
            length,
            useUpper,
            useLower,
            useDigits,
            useSymbols,
            excludeAmbiguous
          })
        );
      }
      setBulkList(list);
      pwd = list[0] || "";
    }

    setCurrentPassword(pwd);

    // 히스토리 추가 (최대 10개)
    if (pwd) {
      setHistory((prev) => [
        { password: pwd, time: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) },
        ...prev.slice(0, 9)
      ]);
    }
  }, [
    mode,
    length,
    useUpper,
    useLower,
    useDigits,
    useSymbols,
    excludeAmbiguous,
    wordCount,
    separator,
    capitalize,
    includeNumber,
    pinLength,
    bulkCount
  ]);


  // QR 코드 모달 렌더링
  useEffect(() => {
    if (showQrModal && qrCanvasRef.current && currentPassword) {
      renderQrCodeToCanvas(qrCanvasRef.current, {
        text: currentPassword,
        errorCorrectionLevel: "M",
        dotStyle: "rounded",
        fgColor: "#000000",
        bgColor: "#ffffff",
        margin: 2,
        size: 260
      });
    }
  }, [showQrModal, currentPassword]);

  // 3. 비밀번호 강도 분석
  const strength: PasswordStrength = useMemo(() => {
    return evaluatePasswordStrength(currentPassword);
  }, [currentPassword]);

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

  // 대량 생성 목록 텍스트 다운로드
  const handleDownloadBulk = () => {
    try {
      const text = bulkList.join("\n");
      const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `passwords_${bulkList.length}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("다운로드 실패:", err);
    }
  };

  // 4. 상단 미니 위젯 컨텐츠
  const miniWidgetContent = (
    <div style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", justifyContent: "space-between" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flex: 1 }}>
        <div
          style={{
            padding: "2px 7px",
            borderRadius: 4,
            background: `${strength.color}25`,
            border: `1px solid ${strength.color}50`,
            color: strength.color,
            fontSize: "0.72rem",
            fontWeight: 700,
            flexShrink: 0
          }}
        >
          {strength.label}
        </div>
        <div
          style={{
            fontSize: "0.85rem",
            fontFamily: "var(--font-mono)",
            color: currentPassword ? "#fff" : "#777",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis"
          }}
        >
          {currentPassword ? (showPassword ? currentPassword : "••••••••••••••••") : "비밀번호 입력 또는 생성"}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
        {/* 복사 버튼 (기존 생성 위치) */}
        <button
          onClick={() => currentPassword && handleCopy("mini-pwd", currentPassword)}
          className="btn-glass"
          style={{
            padding: "5px 8px",
            fontSize: "0.75rem",
            background: "rgba(255, 255, 255, 0.08)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            borderRadius: 6,
            color: copiedKey === "mini-pwd" ? "#0395FC" : "#ccc",
            cursor: currentPassword ? "pointer" : "default",
            opacity: currentPassword ? 1 : 0.5
          }}
          title={copiedKey === "mini-pwd" ? "복사됨!" : "비밀번호 복사"}
          disabled={!currentPassword}
        >
          {copiedKey === "mini-pwd" ? <Check size={12} /> : <Copy size={12} />}
        </button>

        {/* 생성 버튼 (기존 복사 위치) */}
        <button
          onClick={generateNewPassword}
          className="btn-glass"
          style={{
            padding: "5px 12px",
            fontSize: "0.75rem",
            display: "flex",
            alignItems: "center",
            gap: 4,
            background: "rgba(1, 74, 255, 0.2)",
            border: "1px solid rgba(1, 74, 255, 0.4)",
            borderRadius: 6,
            color: "#0395FC",
            fontWeight: 600,
            cursor: "pointer"
          }}
          title="새로운 비밀번호 생성"
        >
          <RefreshCw size={12} className={isRotating ? "spin-icon" : ""} />
          <span>생성</span>
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
        toolName="보안 비밀번호 생성기"
        categoryName="도구"
        categoryPath="/tools"
        onNavigate={onNavigate}
        miniWidgetContent={miniWidgetContent}
      />

      <aside className="post-sidebar post-sidebar-left"></aside>

      <div className="post-detail-container" style={{ maxWidth: 1000, width: "100%", paddingBottom: 120 }}>
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
              <KeyRound size={24} stroke="url(#toolIconGradient)" />
            </div>
            <div>
              <h1 style={{ fontSize: "1.75rem", fontWeight: 700, margin: 0, letterSpacing: "-0.03em" }}>
                보안 비밀번호 생성기
              </h1>
              <p style={{ fontSize: "0.92rem", color: "#888", margin: 0, marginTop: 4 }}>
                암호학적 난수(CSPRNG) 기반의 무작위 비밀번호, Diceware 패스프레이즈 및 PIN 생성
              </p>
            </div>
          </div>
        </div>

        {/* 4. 메인 비밀번호 결과 카드 (대형 디스플레이) */}
        <div
          style={{
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: 20,
            padding: "24px 28px",
            marginBottom: 24,
            boxShadow: "0 12px 36px rgba(0, 0, 0, 0.4)"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            {/* 비밀번호 입력 창 영역 (직접 타이핑하여 보안 강도 테스트 및 생성 결과 확인) */}
            <div
              style={{
                flex: 1,
                minWidth: 260,
                display: "flex",
                alignItems: "center",
                gap: 10,
                background: "rgba(0, 0, 0, 0.25)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: 12,
                padding: "8px 14px",
                transition: "border-color 0.2s"
              }}
            >
              <input
                type={showPassword ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="비밀번호를 직접 입력하거나 생성하세요..."
                autoComplete="off"
                spellCheck={false}
                style={{
                  flex: 1,
                  minWidth: 0,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "#ffffff",
                  fontSize: "1.35rem",
                  fontFamily: "var(--font-mono)",
                  letterSpacing: "0.04em",
                  padding: 0
                }}
              />
              {currentPassword && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      color: "#888",
                      fontFamily: "var(--font-mono)",
                      background: "rgba(255, 255, 255, 0.06)",
                      padding: "2px 6px",
                      borderRadius: 4
                    }}
                  >
                    {currentPassword.length}자
                  </span>
                  <button
                    onClick={() => setCurrentPassword("")}
                    style={{
                      background: "rgba(255, 255, 255, 0.08)",
                      border: "none",
                      borderRadius: "50%",
                      width: 22,
                      height: 22,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#aaa",
                      cursor: "pointer",
                      fontSize: "0.75rem"
                    }}
                    title="입력 내용 지우기"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

            {/* 메인 액션 버튼 그룹 */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              {/* 1. 보기/숨기기 토글 버튼 */}
              <button
                onClick={() => setShowPassword(!showPassword)}
                className="btn-glass"
                style={{
                  padding: "10px",
                  borderRadius: 10,
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  color: "#aaa",
                  cursor: "pointer"
                }}
                title={showPassword ? "비밀번호 숨기기" : "비밀번호 표시"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>

              {/* 2. 비밀번호 복사 버튼 (기존 생성 버튼 위치로 이동) */}
              <button
                onClick={() => currentPassword && handleCopy("main-pwd", currentPassword)}
                className="btn-glass"
                style={{
                  padding: "10px",
                  borderRadius: 10,
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  color: copiedKey === "main-pwd" ? "#0395FC" : "#aaa",
                  cursor: currentPassword ? "pointer" : "default",
                  opacity: currentPassword ? 1 : 0.5
                }}
                title={copiedKey === "main-pwd" ? "복사 완료!" : "비밀번호 복사"}
                disabled={!currentPassword}
              >
                {copiedKey === "main-pwd" ? <Check size={18} /> : <Copy size={18} />}
              </button>

              {/* 3. 모바일 QR 코드 스캔 버튼 */}
              <button
                onClick={() => currentPassword && setShowQrModal(true)}
                className="btn-glass"
                style={{
                  padding: "10px",
                  borderRadius: 10,
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  color: "#aaa",
                  cursor: currentPassword ? "pointer" : "default",
                  opacity: currentPassword ? 1 : 0.5
                }}
                title="스마트폰으로 스캔 (QR)"
                disabled={!currentPassword}
              >
                <QrCode size={18} />
              </button>

              {/* 4. 비밀번호 생성 버튼 (기존 복사 버튼 위치로 이동한 메인 버튼) */}
              <button
                onClick={generateNewPassword}
                className="btn-glass"
                style={{
                  padding: "10px 18px",
                  borderRadius: 10,
                  background: "rgba(1, 74, 255, 0.2)",
                  border: "1px solid rgba(1, 74, 255, 0.4)",
                  color: "#0395FC",
                  fontWeight: 600,
                  fontSize: "0.95rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  whiteSpace: "nowrap"
                }}
                title="새로운 비밀번호 생성"
              >
                <RefreshCw
                  size={18}
                  className={isRotating ? "spin-icon" : ""}
                  style={{ transform: isRotating ? "rotate(180deg)" : "none", transition: "transform 0.3s" }}
                />
                <span>비밀번호 생성</span>
              </button>
            </div>
          </div>

          {/* 비밀번호 강도 & 엔트로피 게이지 바 */}
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid rgba(255, 255, 255, 0.06)" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 8,
                fontSize: "0.82rem",
                flexWrap: "wrap",
                gap: "8px 12px"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ color: "#888", whiteSpace: "nowrap" }}>보안 강도:</span>
                <span style={{ color: strength.color, fontWeight: 700, whiteSpace: "nowrap" }}>{strength.label}</span>
                <span style={{ color: "#666" }}>|</span>
                <span style={{ color: "#aaa", whiteSpace: "nowrap" }}>추정 엔트로피: {strength.entropyBits} bits</span>
              </div>

              <span style={{ color: "#888", whiteSpace: "nowrap" }}>
                균일 난수 가정의 탐색 시간: <strong style={{ color: "#fff" }}>{strength.crackTimeEstimate}</strong>
              </span>
            </div>

            {/* 5단계 프로그레스 세그먼트 */}
            <div style={{ display: "flex", gap: 6, height: 6 }}>
              {[0, 1, 2, 3, 4].map((step) => {
                const isFilled = currentPassword.length > 0 && step <= strength.score;
                return (
                  <div
                    key={step}
                    style={{
                      flex: 1,
                      borderRadius: 3,
                      background: isFilled ? strength.color : "rgba(255, 255, 255, 0.08)",
                      transition: "background 0.3s"
                    }}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* 5. 모드 탭 네비게이션: 모바일에서는 드롭다운 셀렉터, 데스크톱에서는 탭 버튼 */}
        <div style={{ marginBottom: 20 }}>
          {isMobile ? (
            /* 모바일 전용 드롭다운 셀렉터 */
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: "0.8rem", color: "#888", fontWeight: 500 }}>비밀번호 생성 방식</label>
              <div style={{ position: "relative" }}>
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value as GeneratorMode)}
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
                  <option value="random">🔒 무작위 비밀번호 (Random)</option>
                  <option value="passphrase">✨ 기억하기 쉬운 단어 (Passphrase)</option>
                  <option value="pin">🔢 숫자 PIN</option>
                  <option value="bulk">📋 대량 일괄 생성 (Bulk)</option>
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
                { id: "random", label: "무작위 비밀번호", icon: Lock },
                { id: "passphrase", label: "기억하기 쉬운 단어 (Passphrase)", icon: Sparkles },
                { id: "pin", label: "숫자 PIN", icon: KeyRound },
                { id: "bulk", label: "대량 일괄 생성", icon: Sliders }
              ].map((tab) => {
                const IconComp = tab.icon;
                const isActive = mode === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setMode(tab.id as GeneratorMode)}
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

        {/* 6. 설정 옵션 영역 */}
        <div
          style={{
            background: "rgba(255, 255, 255, 0.02)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: 16,
            padding: 22,
            marginBottom: 24
          }}
        >
          {/* 6-1. 무작위 비밀번호 모드 옵션 */}
          {mode === "random" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* 길이 슬라이더 */}
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <label style={{ fontSize: "0.85rem", color: "#ccc" }}>비밀번호 길이</label>
                  <span style={{ fontSize: "1rem", fontWeight: 700, color: "#0395FC" }}>
                    {length}자
                  </span>
                </div>
                <input
                  type="range"
                  min={6}
                  max={64}
                  value={length}
                  onChange={(e) => setLength(Number(e.target.value))}
                  style={{ width: "100%", accentColor: "#0395FC" }}
                />
              </div>

              {/* 문자 구성 체크박스 그리드 */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: 12
                }}
              >
                {[
                  { label: "대문자 (A-Z)", checked: useUpper, setChecked: setUseUpper },
                  { label: "소문자 (a-z)", checked: useLower, setChecked: setUseLower },
                  { label: "숫자 (0-9)", checked: useDigits, setChecked: setUseDigits },
                  { label: "특수문자 (!@#$...)", checked: useSymbols, setChecked: setUseSymbols },
                  { label: "헷갈리는 문자 제외 (1, l, 0, O)", checked: excludeAmbiguous, setChecked: setExcludeAmbiguous }
                ].map((opt, idx) => (
                  <label
                    key={idx}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: "0.85rem",
                      color: "#ccc",
                      cursor: "pointer",
                      padding: "8px 12px",
                      borderRadius: 8,
                      background: "rgba(255, 255, 255, 0.02)",
                      border: "1px solid rgba(255, 255, 255, 0.05)"
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={opt.checked}
                      onChange={(e) => opt.setChecked(e.target.checked)}
                      style={{ accentColor: "#0395FC" }}
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* 6-2. 패스프레이즈 모드 옵션 */}
          {mode === "passphrase" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <label style={{ fontSize: "0.85rem", color: "#ccc" }}>단어 개수</label>
                  <span style={{ fontSize: "1rem", fontWeight: 700, color: "#0395FC" }}>{wordCount}개</span>
                </div>
                <input
                  type="range"
                  min={3}
                  max={8}
                  value={wordCount}
                  onChange={(e) => setWordCount(Number(e.target.value))}
                  style={{ width: "100%", accentColor: "#0395FC" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.82rem", color: "#aaa", marginBottom: 6 }}>
                    구분 기호 (Separator)
                  </label>
                  <select
                    value={separator}
                    onChange={(e) => setSeparator(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      background: "#161616",
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                      borderRadius: 8,
                      color: "#fff"
                    }}
                  >
                    <option value="-">하이픈 (-)</option>
                    <option value="_">언더바 (_)</option>
                    <option value=".">마침표 (.)</option>
                    <option value=" ">공백 ( )</option>
                  </select>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8, justifyContent: "center" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.85rem", color: "#ccc", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={capitalize}
                      onChange={(e) => setCapitalize(e.target.checked)}
                      style={{ accentColor: "#0395FC" }}
                    />
                    <span>단어 첫 글자 대문자화</span>
                  </label>

                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.85rem", color: "#ccc", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={includeNumber}
                      onChange={(e) => setIncludeNumber(e.target.checked)}
                      style={{ accentColor: "#0395FC" }}
                    />
                    <span>랜덤 숫자 포함</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* 6-3. PIN 모드 옵션 */}
          {mode === "pin" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", color: "#ccc", marginBottom: 8 }}>
                  PIN 자리수 선택
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  {[4, 6, 8, 12].map((digits) => (
                    <button
                      key={digits}
                      onClick={() => setPinLength(digits)}
                      style={{
                        padding: "8px 18px",
                        borderRadius: 8,
                        background: pinLength === digits ? "rgba(1, 74, 255, 0.2)" : "rgba(255, 255, 255, 0.05)",
                        border: pinLength === digits ? "1px solid rgba(1, 74, 255, 0.4)" : "1px solid transparent",
                        color: pinLength === digits ? "#0395FC" : "#aaa",
                        fontWeight: pinLength === digits ? 700 : 400,
                        cursor: "pointer"
                      }}
                    >
                      {digits}자리
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 6-4. 대량 생성 모드 옵션 */}
          {mode === "bulk" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: "0.85rem", color: "#aaa" }}>생성 수량:</span>
                  {[5, 10, 20, 50].map((cnt) => (
                    <button
                      key={cnt}
                      onClick={() => setBulkCount(cnt)}
                      style={{
                        padding: "4px 10px",
                        borderRadius: 6,
                        background: bulkCount === cnt ? "rgba(1, 74, 255, 0.2)" : "rgba(255, 255, 255, 0.05)",
                        border: bulkCount === cnt ? "1px solid rgba(1, 74, 255, 0.4)" : "1px solid transparent",
                        color: bulkCount === cnt ? "#0395FC" : "#888",
                        fontSize: "0.8rem",
                        cursor: "pointer"
                      }}
                    >
                      {cnt}개
                    </button>
                  ))}
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => handleCopy("bulk-all", bulkList.join("\n"))}
                    className="btn-glass"
                    style={{
                      padding: "6px 12px",
                      borderRadius: 6,
                      background: "rgba(255, 255, 255, 0.05)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      color: "#eee",
                      fontSize: "0.8rem",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 4
                    }}
                  >
                    {copiedKey === "bulk-all" ? <Check size={13} color="#0395FC" /> : <Copy size={13} />}
                    <span>전체 복사</span>
                  </button>

                  <button
                    onClick={handleDownloadBulk}
                    className="btn-glass"
                    style={{
                      padding: "6px 12px",
                      borderRadius: 6,
                      background: "rgba(1, 74, 255, 0.15)",
                      border: "1px solid rgba(1, 74, 255, 0.3)",
                      color: "#0395FC",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 4
                    }}
                  >
                    <Download size={13} />
                    <span>.txt 파일 저장</span>
                  </button>
                </div>
              </div>

              {/* 대량 목록 미리보기 */}
              <div
                className="custom-scrollbar"
                data-lenis-prevent
                style={{
                  maxHeight: 220,
                  overflowY: "auto",
                  padding: 12,
                  background: "rgba(0, 0, 0, 0.4)",
                  borderRadius: 10,
                  border: "1px solid rgba(255, 255, 255, 0.06)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.85rem"
                }}
              >
                {bulkList.map((pwd, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "4px 6px",
                      borderBottom: "1px solid rgba(255, 255, 255, 0.03)"
                    }}
                  >
                    <span style={{ color: "#eee" }}>{pwd}</span>
                    <button
                      onClick={() => handleCopy(`bulk-${idx}`, pwd)}
                      style={{
                        background: "none",
                        border: "none",
                        color: copiedKey === `bulk-${idx}` ? "#0395FC" : "#666",
                        cursor: "pointer",
                        padding: 2
                      }}
                    >
                      {copiedKey === `bulk-${idx}` ? <Check size={13} /> : <Copy size={13} />}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 7. 최근 생성 히스토리 (세션 전용) */}
        {history.length > 0 && (
          <div
            style={{
              background: "rgba(255, 255, 255, 0.02)",
              border: "1px solid rgba(255, 255, 255, 0.06)",
              borderRadius: 14,
              padding: 16
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <History size={16} color="#0395FC" />
                <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>최근 생성 기록 (현재 세션)</span>
              </div>
              <button
                onClick={() => setHistory([])}
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
                gap: 6,
                maxHeight: 220,
                overflowY: "auto",
                paddingRight: 4
              }}
            >
              {history.map((h, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "6px 10px",
                    borderRadius: 6,
                    background: "rgba(0, 0, 0, 0.3)",
                    border: "1px solid rgba(255, 255, 255, 0.03)",
                    fontSize: "0.82rem"
                  }}
                >
                  <span style={{ fontFamily: "var(--font-mono)", color: "#ccc" }}>{h.password}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: "0.72rem", color: "#666" }}>{h.time}</span>
                    <button
                      onClick={() => handleCopy(`hist-${idx}`, h.password)}
                      style={{
                        background: "none",
                        border: "none",
                        color: copiedKey === `hist-${idx}` ? "#0395FC" : "#888",
                        cursor: "pointer",
                        padding: 0
                      }}
                    >
                      {copiedKey === `hist-${idx}` ? <Check size={13} /> : <Copy size={13} />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 8. 모바일 전송 QR 코드 모달 */}
      <AnimatePresence>
        {showQrModal && (
          <div
            onClick={() => setShowQrModal(false)}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0, 0, 0, 0.75)",
              backdropFilter: "blur(6px)",
              zIndex: 1000,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 20
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: "#121212",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                borderRadius: 20,
                padding: "28px 24px",
                maxWidth: 360,
                width: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#0395FC", marginBottom: 12 }}>
                <Smartphone size={20} />
                <span style={{ fontSize: "1rem", fontWeight: 700 }}>스마트폰으로 스캔</span>
              </div>
              <p style={{ fontSize: "0.82rem", color: "#888", margin: "0 0 16px" }}>
                카메라로 QR 코드를 스캔하여 비밀번호를 복사할 수 있습니다.
              </p>

              <div
                style={{
                  background: "#fff",
                  padding: 12,
                  borderRadius: 14,
                  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.5)",
                  marginBottom: 16
                }}
              >
                <canvas ref={qrCanvasRef} style={{ display: "block" }} />
              </div>

              <button
                onClick={() => setShowQrModal(false)}
                className="btn-glass"
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: 8,
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  color: "#eee",
                  fontSize: "0.85rem",
                  cursor: "pointer"
                }}
              >
                닫기
              </button>
            </div>
          </div>
        )}
      </AnimatePresence>

      <aside className="post-sidebar post-sidebar-right"></aside>
    </motion.div>
  );
}
