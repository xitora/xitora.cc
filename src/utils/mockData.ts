// 더미 데이터(Mock Data) 생성 유틸리티

export type MockFieldType =
  | 'uuid'
  | 'nameKo'
  | 'nameEn'
  | 'email'
  | 'phone'
  | 'address'
  | 'number'
  | 'date'
  | 'boolean'
  | 'city';

export interface MockFieldSchema {
  id: string;
  key: string;
  type: MockFieldType;
  min?: number;
  max?: number;
}

const FIRST_NAMES_KO = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권'];
const LAST_NAMES_KO = ['민준', '서준', '도윤', '예준', '시우', '하준', '지호', '서아', '하윤', '지우', '서윤', '채원', '하은', '지유', '수아'];
const FIRST_NAMES_EN = ['James', 'John', 'Robert', 'Michael', 'David', 'Emma', 'Olivia', 'Sophia', 'Ava', 'Isabella'];
const LAST_NAMES_EN = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis', 'Wilson', 'Anderson', 'Taylor'];
const CITIES_KO = ['서울시 강남구', '서울시 송파구', '서울시 마포구', '부산시 해운대구', '대구시 수성구', '인천시 연수구', '성남시 분당구', '수원시 영통구', '대전시 유성구'];
const STREETS_KO = ['테헤란로', '올림픽로', '양화로', '해운대해변로', '달구벌대로', '센트럴로', '판교역로', '광교중앙로', '대학로'];
const DOMAINS = ['gmail.com', 'naver.com', 'kakao.com', 'daum.net', 'outlook.com', 'xitora.cc'];

/**
 * UUID v4 생성
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * 한국어 이름 무작위 생성
 */
function randomNameKo(): string {
  const first = FIRST_NAMES_KO[Math.floor(Math.random() * FIRST_NAMES_KO.length)];
  const last = LAST_NAMES_KO[Math.floor(Math.random() * LAST_NAMES_KO.length)];
  return `${first}${last}`;
}

/**
 * 영어 이름 무작위 생성
 */
function randomNameEn(): string {
  const first = FIRST_NAMES_EN[Math.floor(Math.random() * FIRST_NAMES_EN.length)];
  const last = LAST_NAMES_EN[Math.floor(Math.random() * LAST_NAMES_EN.length)];
  return `${first} ${last}`;
}

/**
 * 이메일 생성
 */
function randomEmail(nameEn?: string): string {
  const prefix = nameEn ? nameEn.toLowerCase().replace(/\s+/g, '.') : `user${Math.floor(Math.random() * 9000 + 1000)}`;
  const domain = DOMAINS[Math.floor(Math.random() * DOMAINS.length)];
  return `${prefix}@${domain}`;
}

/**
 * 휴대폰 번호 생성
 */
function randomPhone(): string {
  const mid = String(Math.floor(Math.random() * 9000 + 1000));
  const last = String(Math.floor(Math.random() * 9000 + 1000));
  return `010-${mid}-${last}`;
}

/**
 * 한국 도로명 주소 생성
 */
function randomAddress(): string {
  const city = CITIES_KO[Math.floor(Math.random() * CITIES_KO.length)];
  const street = STREETS_KO[Math.floor(Math.random() * STREETS_KO.length)];
  const buildingNum = Math.floor(Math.random() * 120 + 1);
  return `${city} ${street} ${buildingNum}`;
}

/**
 * 과거 1년 이내의 무작위 날짜 생성 (YYYY-MM-DD)
 */
function randomDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - Math.floor(Math.random() * 365));
  return d.toISOString().split('T')[0];
}

/**
 * 단일 레코드 생성
 */
export function generateSingleRecord(schema: MockFieldSchema[]): Record<string, unknown> {
  const record: Record<string, unknown> = {};

  schema.forEach((field) => {
    switch (field.type) {
      case 'uuid':
        record[field.key] = generateUUID();
        break;
      case 'nameKo':
        record[field.key] = randomNameKo();
        break;
      case 'nameEn':
        record[field.key] = randomNameEn();
        break;
      case 'email':
        record[field.key] = randomEmail();
        break;
      case 'phone':
        record[field.key] = randomPhone();
        break;
      case 'address':
        record[field.key] = randomAddress();
        break;
      case 'city':
        record[field.key] = CITIES_KO[Math.floor(Math.random() * CITIES_KO.length)];
        break;
      case 'number': {
        const min = field.min ?? 1;
        const max = field.max ?? 100;
        record[field.key] = Math.floor(Math.random() * (max - min + 1)) + min;
        break;
      }
      case 'date':
        record[field.key] = randomDate();
        break;
      case 'boolean':
        record[field.key] = Math.random() >= 0.5;
        break;
      default:
        record[field.key] = '';
    }
  });

  return record;
}

/**
 * 복수 대량 더미 데이터 생성
 */
export function generateMockDataSet(schema: MockFieldSchema[], count: number): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = [];
  const safeCount = Math.min(Math.max(1, count), 500);

  for (let i = 0; i < safeCount; i++) {
    rows.push(generateSingleRecord(schema));
  }

  return rows;
}

/**
 * CSV 포맷으로 변환
 */
export function convertToCsv(data: Record<string, unknown>[]): string {
  if (data.length === 0) return '';
  const headers = Object.keys(data[0]);

  const csvRows = [headers.join(',')];

  data.forEach((row) => {
    const values = headers.map((header) => {
      const val = row[header];
      if (val === null || val === undefined) return '""';
      const escaped = String(val).replace(/"/g, '""');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(','));
  });

  return csvRows.join('\n');
}

export interface MockSchemaPreset {
  title: string;
  description: string;
  schema: MockFieldSchema[];
}

export const MOCK_SCHEMA_PRESETS: MockSchemaPreset[] = [
  {
    title: '회원/사용자 프로필',
    description: 'ID, 이름, 이메일, 전화번호, 주소, 가입일',
    schema: [
      { id: '1', key: 'id', type: 'uuid' },
      { id: '2', key: 'name', type: 'nameKo' },
      { id: '3', key: 'email', type: 'email' },
      { id: '4', key: 'phone', type: 'phone' },
      { id: '5', key: 'address', type: 'address' },
      { id: '6', key: 'createdAt', type: 'date' },
    ],
  },
  {
    title: '쇼핑몰 주문 데이터',
    description: '주문번호, 고객명, 주문금액, 도시, 결제여부',
    schema: [
      { id: '1', key: 'orderId', type: 'uuid' },
      { id: '2', key: 'customer', type: 'nameKo' },
      { id: '3', key: 'price', type: 'number', min: 10000, max: 250000 },
      { id: '4', key: 'city', type: 'city' },
      { id: '5', key: 'isPaid', type: 'boolean' },
      { id: '6', key: 'orderDate', type: 'date' },
    ],
  },
];
