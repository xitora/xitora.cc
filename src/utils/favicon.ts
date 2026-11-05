// Favicon & 앱 아이콘 생성 유틸리티

export interface IconDimension {
  id: string;
  name: string;
  filename: string;
  size: number;
  description: string;
}

export const ICON_DIMENSIONS: IconDimension[] = [
  { id: 'fav16', name: 'Favicon 16', filename: 'favicon-16x16.png', size: 16, description: '브라우저 탭 기본' },
  { id: 'fav32', name: 'Favicon 32', filename: 'favicon-32x32.png', size: 32, description: '고해상도 브라우저 탭' },
  { id: 'fav48', name: 'Favicon 48', filename: 'favicon-48x48.png', size: 48, description: 'Windows 바탕화면 즐겨찾기' },
  { id: 'apple180', name: 'Apple Touch', filename: 'apple-touch-icon.png', size: 180, description: 'iOS 홈 화면 아이콘' },
  { id: 'android192', name: 'Android 192', filename: 'android-chrome-192x192.png', size: 192, description: 'Android 홈 화면' },
  { id: 'android512', name: 'Android 512', filename: 'android-chrome-512x512.png', size: 512, description: 'PWA 스플래시 화면' },
];

/**
 * CRC32 계산용 테이블 및 함수
 */
const CRC_TABLE: number[] = (() => {
  const table: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  return table;
})();

export function calculateCrc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ data[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export interface ZipFileInput {
  name: string;
  data: Uint8Array | string;
}

/**
 * 무압축(Store 방식) 표준 ZIP 아카이브 바이너리 생성
 */
export function createZipBundle(files: ZipFileInput[]): Uint8Array {
  const fileRecords: {
    nameBytes: Uint8Array;
    dataBytes: Uint8Array;
    crc: number;
    offset: number;
  }[] = [];

  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  let currentOffset = 0;

  // 1. Local File Headers & Data
  files.forEach((file) => {
    const nameBytes = encoder.encode(file.name);
    const dataBytes =
      typeof file.data === 'string' ? encoder.encode(file.data) : file.data;
    const crc = calculateCrc32(dataBytes);

    const header = new Uint8Array(30 + nameBytes.length);
    const view = new DataView(header.buffer);

    view.setUint32(0, 0x04034b50, true); // Local file header signature
    view.setUint16(4, 20, true); // Version needed
    view.setUint16(6, 0, true); // General purpose flag
    view.setUint16(8, 0, true); // Compression method (0 = store)
    view.setUint16(10, 0, true); // Mod time
    view.setUint16(12, 0, true); // Mod date
    view.setUint32(14, crc, true); // CRC32
    view.setUint32(18, dataBytes.length, true); // Compressed size
    view.setUint32(22, dataBytes.length, true); // Uncompressed size
    view.setUint16(26, nameBytes.length, true); // Filename length
    view.setUint16(28, 0, true); // Extra field length

    header.set(nameBytes, 30);

    fileRecords.push({
      nameBytes,
      dataBytes,
      crc,
      offset: currentOffset,
    });

    chunks.push(header);
    chunks.push(dataBytes);
    currentOffset += header.length + dataBytes.length;
  });

  const centralDirStartOffset = currentOffset;
  let centralDirSize = 0;

  // 2. Central Directory Headers
  fileRecords.forEach((record) => {
    const cdHeader = new Uint8Array(46 + record.nameBytes.length);
    const view = new DataView(cdHeader.buffer);

    view.setUint32(0, 0x02014b50, true); // Central directory signature
    view.setUint16(4, 20, true); // Version made by
    view.setUint16(6, 20, true); // Version needed
    view.setUint16(8, 0, true); // General purpose bit flag
    view.setUint16(10, 0, true); // Compression method (0)
    view.setUint16(12, 0, true); // Mod time
    view.setUint16(14, 0, true); // Mod date
    view.setUint32(16, record.crc, true); // CRC32
    view.setUint32(20, record.dataBytes.length, true); // Compressed size
    view.setUint32(24, record.dataBytes.length, true); // Uncompressed size
    view.setUint16(28, record.nameBytes.length, true); // Filename length
    view.setUint16(30, 0, true); // Extra field length
    view.setUint16(32, 0, true); // File comment length
    view.setUint16(34, 0, true); // Disk number start
    view.setUint16(36, 0, true); // Internal attributes
    view.setUint32(38, 0, true); // External attributes
    view.setUint32(42, record.offset, true); // Relative offset of local header

    cdHeader.set(record.nameBytes, 46);

    chunks.push(cdHeader);
    centralDirSize += cdHeader.length;
  });

  // 3. End of Central Directory Record (EOCD)
  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);
  eocdView.setUint32(0, 0x06054b50, true); // EOCD signature
  eocdView.setUint16(4, 0, true); // Disk number
  eocdView.setUint16(6, 0, true); // Disk with central directory
  eocdView.setUint16(8, fileRecords.length, true); // Disk entries
  eocdView.setUint16(10, fileRecords.length, true); // Total entries
  eocdView.setUint32(12, centralDirSize, true); // Central directory size
  eocdView.setUint32(16, centralDirStartOffset, true); // Central directory offset
  eocdView.setUint16(20, 0, true); // Comment length
  chunks.push(eocd);

  // 최종 바이트 버퍼 결합
  const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
  const result = new Uint8Array(totalLength);
  let pos = 0;
  chunks.forEach((chunk) => {
    result.set(chunk, pos);
    pos += chunk.length;
  });

  return result;
}

/**
 * 복수의 PNG 데이터를 포함하는 표준 ICO 파일 바이너리 생성
 */
export function createIcoFromPngs(
  pngList: { width: number; height: number; data: Uint8Array }[]
): Uint8Array {
  const count = pngList.length;
  // ICO Header (6 bytes) + Directory Entries (16 bytes * count)
  const headerSize = 6 + 16 * count;
  let totalDataSize = 0;
  pngList.forEach((item) => {
    totalDataSize += item.data.length;
  });

  const icoBuffer = new Uint8Array(headerSize + totalDataSize);
  const view = new DataView(icoBuffer.buffer);

  // ICONHEADER
  view.setUint16(0, 0, true); // Reserved
  view.setUint16(2, 1, true); // 1 = ICO
  view.setUint16(4, count, true); // 이미지 개수

  let currentOffset = headerSize;

  pngList.forEach((item, index) => {
    const entryOffset = 6 + index * 16;
    view.setUint8(entryOffset, item.width >= 256 ? 0 : item.width);
    view.setUint8(entryOffset + 1, item.height >= 256 ? 0 : item.height);
    view.setUint8(entryOffset + 2, 0); // Palette count
    view.setUint8(entryOffset + 3, 0); // Reserved
    view.setUint16(entryOffset + 4, 1, true); // Color planes
    view.setUint16(entryOffset + 6, 32, true); // Bits per pixel
    view.setUint32(entryOffset + 8, item.data.length, true); // Data size
    view.setUint32(entryOffset + 12, currentOffset, true); // Offset

    icoBuffer.set(item.data, currentOffset);
    currentOffset += item.data.length;
  });

  return icoBuffer;
}

/**
 * 웹용 HTML 헤더 메타 태그 스니펫 생성
 */
export function generateHtmlSnippet(appName = '내 웹사이트'): string {
  return `<!-- Favicon & App Icons -->
<link rel="icon" type="image/x-icon" href="/favicon.ico">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="48x48" href="/favicon-48x48.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="apple-mobile-web-app-title" content="${appName}">
<meta name="theme-color" content="#ffffff">`;
}

/**
 * site.webmanifest JSON 파일 내용 생성
 */
export function generateWebManifestJson(appName = '내 웹사이트'): string {
  return JSON.stringify(
    {
      name: appName,
      short_name: appName,
      icons: [
        {
          src: '/android-chrome-192x192.png',
          sizes: '192x192',
          type: 'image/png',
        },
        {
          src: '/android-chrome-512x512.png',
          sizes: '512x512',
          type: 'image/png',
        },
      ],
      theme_color: '#ffffff',
      background_color: '#ffffff',
      display: 'standalone',
    },
    null,
    2
  );
}
