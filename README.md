# xitora.cc

프로필, 포스트, 개인 프로젝트, 브라우저 도구, 인게임 설정을 모은 개인 웹사이트입니다.

React 19 · TypeScript · Vite · Framer Motion · Lenis

## 실행

```sh
npm ci
npm run dev
```

`npm test`로 단위 테스트를, `npm run build`로 타입 검사와 배포용 빌드를 실행합니다. 결과는 `dist/`에 생성됩니다.

## 콘텐츠

- 게시글: `src/data/posts/*.md`
- 프로젝트 소개: `src/pages/ProjectsPage.tsx`
- 도구 목록과 로직: `src/data/tools.ts`, `src/utils/`
- 게임 설정·연락처·장비: `src/data/`

## 배포

GitHub `xitora/xitora.cc`와 Vercel을 연결합니다. `main` 푸시는 운영 배포, 다른 브랜치 푸시는 Preview 배포를 생성합니다.

Vercel 설정은 `vercel.json`에 있습니다. 빌드 후 경로별 공유 미리보기 메타 태그를 생성하고, 나머지 경로는 SPA 진입점으로 연결합니다. 별도 환경변수는 필요하지 않습니다.
