/**
 * QR 코드 생성 및 페이로드 빌더 유틸리티
 */
import QRCode from "qrcode";

export type QrErrorCorrectionLevel = "L" | "M" | "Q" | "H";
export type QrDotStyle = "square" | "dots" | "rounded";
export type QrFinderStyle = "square" | "rounded" | "circle";

export interface WifiPayloadOptions {
  ssid: string;
  password?: string;
  encryption?: "WPA" | "WEP" | "nopass";
  hidden?: boolean;
}

export interface VCardPayloadOptions {
  name: string;
  phone?: string;
  email?: string;
  organization?: string;
  title?: string;
}

export interface EmailPayloadOptions {
  to: string;
  subject?: string;
  body?: string;
}

export interface SmsPayloadOptions {
  phone: string;
  message?: string;
}

export interface QrRenderOptions {
  text: string;
  errorCorrectionLevel: QrErrorCorrectionLevel;
  dotStyle?: QrDotStyle;
  dotRadius?: number; // 0 ~ 100 (%) 곡률 슬라이더
  finderStyle?: QrFinderStyle;
  finderRadius?: number; // 0 ~ 100 (%) 파인더 패턴 곡률 슬라이더
  fgColor: string;
  fgColor2?: string;
  useFgGradient?: boolean;
  bgColor: string;
  bgColor2?: string;
  useBgGradient?: boolean;
  margin: number;
  size: number;
  logoDataUrl?: string | null;
  logoSizePercent?: number; // 10 ~ 30%
}

/**
 * Wi-Fi 연결용 표준 문자열 페이로드를 생성합니다.
 * 형식: WIFI:S:MySSID;T:WPA;P:MyPassword;H:false;;
 */
export function buildWifiPayload(options: WifiPayloadOptions): string {
  try {
    const { ssid, password = "", encryption = "WPA", hidden = false } = options;
    if (!ssid || ssid.trim() === "") return "";
    
    // 특수문자 이스케이프 (\, ;, ,, :)
    const escape = (str: string) => str.replace(/([\\;,":])/g, "\\$1");
    
    const parts = [
      `T:${encryption}`,
      `S:${escape(ssid.trim())}`
    ];
    
    if (encryption !== "nopass" && password) {
      parts.push(`P:${escape(password)}`);
    }
    
    if (hidden) {
      parts.push("H:true");
    }
    
    return `WIFI:${parts.join(";")};;`;
  } catch (error) {
    console.error("Wi-Fi 페이로드 생성 실패:", error);
    return "";
  }
}

/**
 * vCard 명함 표준 형식 문자열을 생성합니다.
 */
export function buildVCardPayload(options: VCardPayloadOptions): string {
  try {
    const { name, phone = "", email = "", organization = "", title = "" } = options;
    if (!name || name.trim() === "") return "";

    const lines = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      `FN:${name.trim()}`
    ];

    if (phone.trim()) {
      lines.push(`TEL;TYPE=CELL:${phone.trim()}`);
    }
    if (email.trim()) {
      lines.push(`EMAIL:${email.trim()}`);
    }
    if (organization.trim()) {
      lines.push(`ORG:${organization.trim()}`);
    }
    if (title.trim()) {
      lines.push(`TITLE:${title.trim()}`);
    }

    lines.push("END:VCARD");
    return lines.join("\n");
  } catch (error) {
    console.error("vCard 페이로드 생성 실패:", error);
    return "";
  }
}

/**
 * 이메일 발송용 mailto URL을 생성합니다.
 */
export function buildEmailPayload(options: EmailPayloadOptions): string {
  try {
    const { to, subject = "", body = "" } = options;
    if (!to || to.trim() === "") return "";

    const params = new URLSearchParams();
    if (subject.trim()) params.append("subject", subject.trim());
    if (body.trim()) params.append("body", body.trim());

    const queryString = params.toString();
    return `mailto:${encodeURIComponent(to.trim())}${queryString ? `?${queryString}` : ""}`;
  } catch (error) {
    console.error("이메일 페이로드 생성 실패:", error);
    return "";
  }
}

/**
 * SMS 전송용 smsto URI를 생성합니다.
 */
export function buildSmsPayload(options: SmsPayloadOptions): string {
  try {
    const { phone, message = "" } = options;
    if (!phone || phone.trim() === "") return "";
    
    const cleanPhone = phone.replace(/[^0-9+]/g, "");
    if (message.trim()) {
      return `smsto:${cleanPhone}:${message.trim()}`;
    }
    return `tel:${cleanPhone}`;
  } catch (error) {
    console.error("SMS 페이로드 생성 실패:", error);
    return "";
  }
}

/**
 * 두 색상 간의 상대 휘도(Luminance)와 대비(Contrast Ratio)를 계산합니다.
 */
export function getContrastRatio(hex1: string, hex2: string): number {
  try {
    const getLuminance = (hex: string) => {
      const cleanHex = hex.replace("#", "");
      if (cleanHex.length !== 6) return 0.5;
      const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
      const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
      const b = parseInt(cleanHex.substring(4, 6), 16) / 255;
      const a = [r, g, b].map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
      return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
    };

    const l1 = getLuminance(hex1);
    const l2 = getLuminance(hex2);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  } catch {
    return 21; // 기본 최댓값
  }
}

/**
 * QR 코드 모듈 매트릭스를 계산하여 Canvas에 사용자 정의 스타일(모서리 둥글기, 도트, 로고, 파인더 패턴, 그라데이션 등)로 렌더링합니다.
 */
export async function renderQrCodeToCanvas(
  canvas: HTMLCanvasElement,
  options: QrRenderOptions
): Promise<void> {
  const {
    text,
    errorCorrectionLevel,
    dotStyle,
    dotRadius,
    finderStyle = "square",
    finderRadius,
    fgColor,
    fgColor2,
    useFgGradient = false,
    bgColor,
    bgColor2,
    useBgGradient = false,
    margin,
    size,
    logoDataUrl,
    logoSizePercent = 22
  } = options;

  if (!text || text.trim() === "") {
    const ctx = canvas.getContext("2d");
    if (ctx) {
      canvas.width = size;
      canvas.height = size;
      ctx.clearRect(0, 0, size, size);
    }
    return;
  }

  try {
    // 1. QR 코드 원시 매트릭스 데이터 생성
    const qrData = QRCode.create(text, {
      errorCorrectionLevel
    });

    const moduleCount = qrData.modules.size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = size;
    canvas.height = size;

    // 2. 배경 채우기 (단색 또는 대각선 그라데이션)
    if (bgColor && bgColor !== "transparent") {
      if (useBgGradient && bgColor2 && bgColor2 !== "transparent") {
        const bgGrad = ctx.createLinearGradient(0, 0, size, size);
        bgGrad.addColorStop(0, bgColor);
        bgGrad.addColorStop(1, bgColor2);
        ctx.fillStyle = bgGrad;
      } else {
        ctx.fillStyle = bgColor;
      }
      ctx.fillRect(0, 0, size, size);
    } else {
      ctx.clearRect(0, 0, size, size);
    }

    // 여백 및 모듈 단일 픽셀 크기 계산
    const totalModules = moduleCount + margin * 2;
    const moduleSize = size / totalModules;
    const offset = margin * moduleSize;

    // 전경 스타일 (단색 또는 대각선 그라데이션)
    let activeFgStyle: string | CanvasGradient = fgColor;
    if (useFgGradient && fgColor2) {
      const fgGrad = ctx.createLinearGradient(0, 0, size, size);
      fgGrad.addColorStop(0, fgColor);
      fgGrad.addColorStop(1, fgColor2);
      activeFgStyle = fgGrad;
    }
    ctx.fillStyle = activeFgStyle;
    ctx.strokeStyle = activeFgStyle;

    // 눈금 패턴(Finder Pattern) 3개 위치 (좌상, 우상, 좌하) 7x7 블록 체크 함수
    const isFinderPattern = (r: number, c: number): boolean => {
      if (r < 7 && c < 7) return true; // 좌상
      if (r < 7 && c >= moduleCount - 7) return true; // 우상
      if (r >= moduleCount - 7 && c < 7) return true; // 좌하
      return false;
    };

    // 중앙 로고 영역 마진 계산 (모듈 단위)
    let logoModuleBounds: { minR: number; maxR: number; minC: number; maxC: number } | null = null;
    if (logoDataUrl) {
      const logoModuleCoverage = Math.floor(moduleCount * (logoSizePercent / 100));
      const startMod = Math.floor((moduleCount - logoModuleCoverage) / 2);
      logoModuleBounds = {
        minR: startMod,
        maxR: startMod + logoModuleCoverage,
        minC: startMod,
        maxC: startMod + logoModuleCoverage
      };
    }

    // 3. 일반 데이터 모듈 렌더링 (파인더 패턴은 건너뜀)
    for (let r = 0; r < moduleCount; r++) {
      for (let c = 0; c < moduleCount; c++) {
        const isDark = qrData.modules.get(r, c);
        if (!isDark) continue;

        // 파인더 패턴은 별도 고품질 렌더러로 처리
        if (isFinderPattern(r, c)) continue;

        // 로고 바로 뒤 모듈은 가려지므로 그리지 않음
        if (
          logoModuleBounds &&
          r >= logoModuleBounds.minR &&
          r <= logoModuleBounds.maxR &&
          c >= logoModuleBounds.minC &&
          c <= logoModuleBounds.maxC
        ) {
          continue;
        }

        const x = offset + c * moduleSize;
        const y = offset + r * moduleSize;

        // 도트 모양 (dotRadius 슬라이더 우선, 0: 사각형, 100: 원형, 그 사이: 둥근 사각형)
        const activeDotRadius = typeof dotRadius === "number"
          ? dotRadius
          : dotStyle === "dots" ? 100 : dotStyle === "rounded" ? 40 : 0;

        if (activeDotRadius <= 0) {
          ctx.fillRect(x, y, Math.ceil(moduleSize), Math.ceil(moduleSize));
        } else if (activeDotRadius >= 100) {
          ctx.beginPath();
          const radius = moduleSize * 0.48;
          ctx.arc(x + moduleSize / 2, y + moduleSize / 2, radius, 0, Math.PI * 2);
          ctx.fill();
        } else {
          const cornerR = (moduleSize * 0.5) * (activeDotRadius / 100);
          ctx.beginPath();
          ctx.roundRect(x, y, moduleSize, moduleSize, cornerR);
          ctx.fill();
        }
      }
    }

    // 4. 모서리 3개 파인더 패턴(Finder Pattern) 렌더링 (finderRadius 곡률 슬라이더 지원)
    const activeFinderRadius = typeof finderRadius === "number"
      ? finderRadius
      : finderStyle === "circle" ? 100 : finderStyle === "rounded" ? 50 : 0;

    const drawFinder = (startX: number, startY: number) => {
      ctx.lineWidth = moduleSize;
      ctx.strokeStyle = activeFgStyle;
      ctx.fillStyle = activeFgStyle;

      if (activeFinderRadius >= 100) {
        const cx = startX + 3.5 * moduleSize;
        const cy = startY + 3.5 * moduleSize;
        // 외곽 링
        ctx.beginPath();
        ctx.arc(cx, cy, 3 * moduleSize, 0, Math.PI * 2);
        ctx.stroke();
        // 내부 코어
        ctx.beginPath();
        ctx.arc(cx, cy, 1.5 * moduleSize, 0, Math.PI * 2);
        ctx.fill();
      } else if (activeFinderRadius <= 0) {
        // square (기본 직각 사각형)
        const rx = startX + 0.5 * moduleSize;
        const ry = startY + 0.5 * moduleSize;
        const rw = 6 * moduleSize;
        ctx.strokeRect(rx, ry, rw, rw);
        ctx.fillRect(startX + 2 * moduleSize, startY + 2 * moduleSize, 3 * moduleSize, 3 * moduleSize);
      } else {
        // 둥근 모서리 (곡률 슬라이더에 비례)
        const rx = startX + 0.5 * moduleSize;
        const ry = startY + 0.5 * moduleSize;
        const rw = 6 * moduleSize;
        const outerCorner = (3 * moduleSize) * (activeFinderRadius / 100);
        const innerCorner = (1.5 * moduleSize) * (activeFinderRadius / 100);

        ctx.beginPath();
        ctx.roundRect(rx, ry, rw, rw, outerCorner);
        ctx.stroke();

        ctx.beginPath();
        ctx.roundRect(startX + 2 * moduleSize, startY + 2 * moduleSize, 3 * moduleSize, 3 * moduleSize, innerCorner);
        ctx.fill();
      }
    };

    // 3개 모서리 파인더 패턴 그리기
    drawFinder(offset, offset); // 좌상
    drawFinder(offset + (moduleCount - 7) * moduleSize, offset); // 우상
    drawFinder(offset, offset + (moduleCount - 7) * moduleSize); // 좌하

    // 5. 로고 렌더링 (있을 경우)
    if (logoDataUrl) {
      await new Promise<void>((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          const logoPixelSize = size * (logoSizePercent / 100);
          const logoX = (size - logoPixelSize) / 2;
          const logoY = (size - logoPixelSize) / 2;
          const pad = logoPixelSize * 0.08;

          // 로고 뒤 배경 흰색/배경색 원형 또는 라운드 패딩 마스크
          ctx.fillStyle = bgColor === "transparent" ? "#ffffff" : bgColor;
          ctx.beginPath();
          ctx.roundRect(
            logoX - pad,
            logoY - pad,
            logoPixelSize + pad * 2,
            logoPixelSize + pad * 2,
            logoPixelSize * 0.2
          );
          ctx.fill();

          // 로고 이미지 렌더링
          ctx.drawImage(img, logoX, logoY, logoPixelSize, logoPixelSize);
          resolve();
        };
        img.onerror = () => {
          console.warn("로고 이미지 로드 실패");
          resolve();
        };
        img.src = logoDataUrl;
      });
    }
  } catch (error) {
    console.error("QR 코드 렌더링 중 오류:", error);
  }
}

/**
 * QR 코드를 SVG 문자열로 생성합니다 (그라데이션 및 커스텀 파인더 패턴 지원).
 */
export async function generateQrSvgString(options: {
  text: string;
  errorCorrectionLevel: QrErrorCorrectionLevel;
  dotStyle?: QrDotStyle;
  dotRadius?: number;
  finderStyle?: QrFinderStyle;
  finderRadius?: number;
  fgColor: string;
  fgColor2?: string;
  useFgGradient?: boolean;
  bgColor: string;
  bgColor2?: string;
  useBgGradient?: boolean;
  margin: number;
}): Promise<string> {
  const {
    text,
    errorCorrectionLevel,
    dotStyle = "square",
    dotRadius,
    finderStyle = "square",
    finderRadius,
    fgColor,
    fgColor2,
    useFgGradient = false,
    bgColor,
    bgColor2,
    useBgGradient = false,
    margin
  } = options;
  if (!text || text.trim() === "") return "";

  try {
    const qrData = QRCode.create(text, { errorCorrectionLevel });
    const moduleCount = qrData.modules.size;
    const totalModules = moduleCount + margin * 2;
    const viewBoxSize = totalModules;

    const isFinderPattern = (r: number, c: number): boolean => {
      if (r < 7 && c < 7) return true;
      if (r < 7 && c >= moduleCount - 7) return true;
      if (r >= moduleCount - 7 && c < 7) return true;
      return false;
    };

    // 글로벌 userSpaceOnUse 그라데이션 좌표 (개별 모듈 타일링 버그 방지)
    const gx1 = margin;
    const gy1 = margin;
    const gx2 = margin + moduleCount;
    const gy2 = margin + moduleCount;

    let defs = "<defs>";
    let bgFill = bgColor === "transparent" ? "none" : bgColor;
    if (useBgGradient && bgColor2 && bgColor !== "transparent") {
      defs += `<linearGradient id="qrBgGrad" gradientUnits="userSpaceOnUse" x1="${gx1}" y1="${gy1}" x2="${gx2}" y2="${gy2}">
        <stop offset="0%" stop-color="${bgColor}" />
        <stop offset="100%" stop-color="${bgColor2}" />
      </linearGradient>`;
      bgFill = "url(#qrBgGrad)";
    }

    let fgFill = fgColor;
    if (useFgGradient && fgColor2) {
      defs += `<linearGradient id="qrFgGrad" gradientUnits="userSpaceOnUse" x1="${gx1}" y1="${gy1}" x2="${gx2}" y2="${gy2}">
        <stop offset="0%" stop-color="${fgColor}" />
        <stop offset="100%" stop-color="${fgColor2}" />
      </linearGradient>`;
      fgFill = "url(#qrFgGrad)";
    }
    defs += "</defs>";

    let body = "";
    if (bgFill !== "none") {
      body += `<rect width="${viewBoxSize}" height="${viewBoxSize}" fill="${bgFill}" />`;
    }

    const activeDotRadius = typeof dotRadius === "number"
      ? dotRadius
      : dotStyle === "dots" ? 100 : dotStyle === "rounded" ? 40 : 0;

    const activeFinderRadius = typeof finderRadius === "number"
      ? finderRadius
      : finderStyle === "circle" ? 100 : finderStyle === "rounded" ? 50 : 0;

    // 일반 데이터 모듈
    for (let r = 0; r < moduleCount; r++) {
      for (let c = 0; c < moduleCount; c++) {
        if (!qrData.modules.get(r, c)) continue;
        if (isFinderPattern(r, c)) continue;

        const x = margin + c;
        const y = margin + r;

        if (activeDotRadius <= 0) {
          body += `<rect x="${x}" y="${y}" width="1" height="1" fill="${fgFill}" />`;
        } else if (activeDotRadius >= 100) {
          body += `<circle cx="${x + 0.5}" cy="${y + 0.5}" r="0.48" fill="${fgFill}" />`;
        } else {
          const cornerR = (0.5 * (activeDotRadius / 100)).toFixed(2);
          body += `<rect x="${x}" y="${y}" width="1" height="1" rx="${cornerR}" ry="${cornerR}" fill="${fgFill}" />`;
        }
      }
    }

    // 모서리 3개 파인더 패턴
    const drawSvgFinder = (fx: number, fy: number) => {
      if (activeFinderRadius >= 100) {
        const cx = fx + 3.5;
        const cy = fy + 3.5;
        return `<circle cx="${cx}" cy="${cy}" r="3" fill="none" stroke="${fgFill}" stroke-width="1" /><circle cx="${cx}" cy="${cy}" r="1.5" fill="${fgFill}" />`;
      } else if (activeFinderRadius <= 0) {
        return `<rect x="${fx + 0.5}" y="${fy + 0.5}" width="6" height="6" fill="none" stroke="${fgFill}" stroke-width="1" /><rect x="${fx + 2}" y="${fy + 2}" width="3" height="3" fill="${fgFill}" />`;
      } else {
        const outerR = (3 * (activeFinderRadius / 100)).toFixed(2);
        const innerR = (1.5 * (activeFinderRadius / 100)).toFixed(2);
        return `<rect x="${fx + 0.5}" y="${fy + 0.5}" width="6" height="6" rx="${outerR}" ry="${outerR}" fill="none" stroke="${fgFill}" stroke-width="1" /><rect x="${fx + 2}" y="${fy + 2}" width="3" height="3" rx="${innerR}" ry="${innerR}" fill="${fgFill}" />`;
      }
    };

    body += drawSvgFinder(margin, margin);
    body += drawSvgFinder(margin + moduleCount - 7, margin);
    body += drawSvgFinder(margin, margin + moduleCount - 7);

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewBoxSize} ${viewBoxSize}" width="100%" height="100%">${defs}${body}</svg>`;
  } catch (error) {
    console.error("QR SVG 생성 오류:", error);
    return "";
  }
}

