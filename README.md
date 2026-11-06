# xitora.cc

프로필, 포스트, 개인 프로젝트, 브라우저 도구, 인게임 설정을 모은 개인 웹사이트입니다.

React 19 · TypeScript · Vite · Framer Motion · Lenis

## 실행

```sh
npm ci
npm run dev
```

`npm test`로 단위 테스트를, `npm run build`로 타입 검사와 배포용 빌드를 실행합니다. 결과는 `dist/`에 생성됩니다.

`npm run preview`를 별도 터미널에서 실행한 뒤 `npm run test:browser`로 전체 페이지와 주요 도구 흐름을 확인합니다.

## 콘텐츠

- 게시글: `src/data/posts/*.md`
- 프로젝트 소개: `src/pages/ProjectsPage.tsx`
- 도구 목록: `src/data/toolRegistry.json`
- 도구 화면·로직: `src/workspaces/`, `src/utils/`
- 게임 설정·연락처·장비: `src/data/`

## 배포

GitHub `xitora/xitora.cc`는 Vercel `x1t0ra/xitora-cc`에 연결되어 있습니다. `main` 푸시는 운영 배포, 다른 브랜치 푸시는 Preview 배포를 생성합니다.

Vercel 설정은 `vercel.json`에 있습니다. 빌드 후 경로별 공유 미리보기 메타 태그를 생성하고, 나머지 경로는 SPA 진입점으로 연결합니다. 별도 환경변수는 필요하지 않습니다.

## 도구

18개 작업실은 파일과 입력을 브라우저에서 처리합니다. 일반 입력·옵션은 마지막 수정 후 7일 동안 보관하며, 요청 분석의 URL·cURL·JWT·검증 키와 선택한 파일은 자동 저장하지 않습니다. 도구별 초기화와 목록의 전체 삭제로 저장된 입력을 지울 수 있습니다.

도구 화면은 설치·오프라인 재실행을 지원합니다. 새 버전은 안내 후 직접 적용합니다. PDF·오디오 등 큰 파일은 기기의 메모리에 따라 처리 한도가 달라집니다. 기존 도구 주소는 `/tools`로 이동합니다.
