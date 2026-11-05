/**
 * 이미지 최적화 도구 유틸리티 엔진
 * - 브라우저 Canvas 및 Blob 기반 클라이언트 로컬 무손실/고효율 압축
 * - WebP, PNG, JPEG 변환 및 해상도 리사이징
 * - 파일 크기 포맷팅 및 비율 계산
 */

export interface CompressionOptions {
  format: 'image/webp' | 'image/jpeg' | 'image/png';
  quality: number; // 0.01 ~ 1.0
  maxWidth?: number;
  maxHeight?: number;
  maintainAspectRatio: boolean;
  stripMetadata?: boolean;
}

export interface ImageOptimizationResult {
  originalSize: number;
  compressedSize: number;
  savedBytes: number;
  savedPercent: number;
  width: number;
  height: number;
  format: string;
  blob: Blob;
  dataUrl: string;
}

/**
 * 바이트 단위 파일 크기를 읽기 쉬운 문자열로 변환 (예: 1.45 MB, 320 KB)
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 B';
  if (isNaN(bytes) || bytes < 0) return '0 B';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const safeI = Math.min(sizes.length - 1, Math.max(0, i));

  return parseFloat((bytes / Math.pow(k, safeI)).toFixed(dm)) + ' ' + sizes[safeI];
}

/**
 * 원본 비율을 유지하며 지정된 최대 너비/높이에 맞춘 리사이즈 크기 계산
 */
export function calculateAspectRatioFit(
  srcWidth: number,
  srcHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  if (srcWidth <= 0 || srcHeight <= 0) {
    return { width: Math.max(1, maxWidth), height: Math.max(1, maxHeight) };
  }

  const ratio = Math.min(maxWidth / srcWidth, maxHeight / srcHeight, 1);
  return {
    width: Math.max(1, Math.round(srcWidth * ratio)),
    height: Math.max(1, Math.round(srcHeight * ratio)),
  };
}

/**
 * 이미지 Blob/File을 Image 엘리먼트로 로드
 */
export function loadImageElement(source: File | Blob | string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    let url: string;
    if (typeof source === 'string') {
      url = source;
    } else {
      url = URL.createObjectURL(source);
    }

    img.onload = () => {
      if (typeof source !== 'string') {
        URL.revokeObjectURL(url);
      }
      resolve(img);
    };

    img.onerror = (err) => {
      if (typeof source !== 'string') {
        URL.revokeObjectURL(url);
      }
      reject(new Error('이미지를 불러오는데 실패했습니다: ' + err));
    };

    img.src = url;
  });
}

/**
 * 브라우저 캔버스를 통해 단일 이미지 압축 및 포맷 변환 수행
 */
export async function optimizeImage(
  imageSource: File | Blob | HTMLImageElement,
  options: CompressionOptions
): Promise<ImageOptimizationResult> {
  let img: HTMLImageElement;
  let originalSize = 0;

  if (imageSource instanceof HTMLImageElement) {
    img = imageSource;
    originalSize = 0;
  } else {
    originalSize = imageSource.size;
    img = await loadImageElement(imageSource);
  }

  const srcWidth = img.naturalWidth || img.width;
  const srcHeight = img.naturalHeight || img.height;

  let targetWidth = srcWidth;
  let targetHeight = srcHeight;

  if (options.maxWidth && options.maxHeight && options.maintainAspectRatio) {
    const fit = calculateAspectRatioFit(srcWidth, srcHeight, options.maxWidth, options.maxHeight);
    targetWidth = fit.width;
    targetHeight = fit.height;
  } else {
    if (options.maxWidth) targetWidth = options.maxWidth;
    if (options.maxHeight) targetHeight = options.maxHeight;
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D 컨텍스트를 생성할 수 없습니다.');
  }

  // 투명 배경이 없는 JPEG의 경우 흰색 배경 채우기
  if (options.format === 'image/jpeg') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, targetWidth, targetHeight);
  }

  // 부드러운 고품질 이미지 리샘플링
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('이미지 인코딩에 실패했습니다.'));
          return;
        }

        const compressedSize = blob.size;
        const savedBytes = Math.max(0, originalSize - compressedSize);
        const savedPercent = originalSize > 0 ? ((savedBytes / originalSize) * 100) : 0;
        const dataUrl = canvas.toDataURL(options.format, options.quality);

        resolve({
          originalSize,
          compressedSize,
          savedBytes,
          savedPercent,
          width: targetWidth,
          height: targetHeight,
          format: blob.type,
          blob,
          dataUrl,
        });
      },
      options.format,
      options.quality
    );
  });
}
