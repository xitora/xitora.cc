/**
 * 브라우저 기반 도구 모음 메타데이터 정의
 */

export interface ToolItem {
  id: string;
  title: string;
  description: string;
  category: string;
  status?: string;
}

export const toolsList: ToolItem[] = [
  {
    id: "css-easing-sandbox",
    title: "CSS 애니메이션 이징(Easing) 샌드박스",
    description: "cubic-bezier 커브를 인터랙티브하게 조절하며 UI 전환 프리뷰 및 코드 추출 도구",
    category: "개발자 도구"
  },
  {
    id: "curl-converter",
    title: "cURL ↔ 언어별 코드 변환기",
    description: "cURL 명령어를 Fetch, Axios, Python Requests, Go HTTP 코드로 즉시 변환하는 도구",
    category: "개발자 도구"
  },
  {
    id: "favicon-generator",
    title: "Favicon & 앱 아이콘 생성기",
    description: "단일 고해상도 이미지를 기반으로 웹용 파비콘(ico/png) 및 iOS/안드로이드 규격별 번들 ZIP 생성기",
    category: "개발자 도구"
  },
  {
    id: "jwt-debugger",
    title: "JWT 디코더 & 검증기",
    description: "JWT 토큰의 Header와 Payload를 실시간 디코딩하고, 만료 시간(exp) 및 HMAC 서명 유효성을 검증하는 도구",
    category: "개발자 도구"
  },
  {
    id: "qr-generator",
    title: "QR 코드 생성기",
    description: "URL, Wi-Fi, 명함, 연락처 등 다양한 데이터를 고화질 벡터 및 로고 QR 코드로 제작하는 도구",
    category: "개발자 도구"
  },
  {
    id: "svg-path-visualizer",
    title: "SVG 경로(Path) 비주얼라이저",
    description: "복잡한 SVG Path(d 속성) 코드를 붙여넣어 노드와 베지어 곡선 포인트를 시각적으로 분해·검사하는 도구",
    category: "개발자 도구"
  },
  {
    id: "url-parser",
    title: "URL 파서 & 쿼리스트링 빌더",
    description: "긴 URL의 Protocol, Host, Path, Query Parameter 분해 및 파라미터 실시간 추가·수정 도구",
    category: "개발자 도구"
  },
  {
    id: "unit-currency-converter",
    title: "단위 & 환율 변환기",
    description: "길이, 면적(평 ↔ ㎡), 무게, 데이터 단위 및 주요 외화 환율 즉시 계산 도구",
    category: "유틸리티"
  },
  {
    id: "mock-data-generator",
    title: "더미 데이터(Mock Data) 생성기",
    description: "이름, 이메일, 주소, UUID 등 스키마 정의에 따른 JSON/CSV 가상 데이터 대량 생성 도구",
    category: "개발자 도구"
  },
  {
    id: "dutch-pay-calculator",
    title: "더치페이 & 정산 계산기",
    description: "n빵 균등 정산, 2차/차등 항목 정산, 100원 단위 절사 및 카카오톡 영수증 공유 도구",
    category: "생산성"
  },
  {
    id: "noise-generator",
    title: "디지털 노이즈 사운드 생성기",
    description: "백색소음, 빗소리, 모닥불 등 웹 오디오 기반 수면·집중용 앰비언스 믹서 도구",
    category: "미디어"
  },
  {
    id: "password-generator",
    title: "비밀번호 생성기",
    description: "암호학적 난수(CSPRNG) 기반의 무작위 비밀번호, Diceware 패스프레이즈 및 PIN 생성 도구",
    category: "유틸리티"
  },
  {
    id: "color-palette",
    title: "색상 팔레트 분석기",
    description: "이미지 주요 색상 자동 추출, 색채 조화 팔레트 및 WCAG 접근성 명도 대비 분석 도구",
    category: "디자인"
  },
  {
    id: "world-time",
    title: "세계 시간 조율",
    description: "24시간 인터랙티브 타임 슬라이더 기반 다국가 시차 비교 및 협업 골든 타임 조율 도구",
    category: "생산성"
  },
  {
    id: "image-optimizer",
    title: "이미지 최적화 도구",
    description: "브라우저 로컬 기반 무손실·고효율 이미지 압축, 포맷 변환 및 비포/애프터 비교 도구",
    category: "미디어"
  },
  {
    id: "regex-tester",
    title: "정규식 테스터",
    description: "정규표현식 실시간 매칭 분석, 캡처 그룹 하이라이트 및 코드 스니펫 생성 도구",
    category: "개발자 도구"
  },
  {
    id: "data-inspector",
    title: "포맷 변환",
    description: "다양한 포맷 데이터를 변환하는 도구",
    category: "개발자 도구"
  }
];

export const toolCategories = ["All", ...Array.from(new Set(toolsList.map((t) => t.category)))];
