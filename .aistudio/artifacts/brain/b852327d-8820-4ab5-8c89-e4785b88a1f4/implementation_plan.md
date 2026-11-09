# GitHub 공식 표준 Pages 배포 워크플로 및 Vite Base 경로 구성 계획

GitHub 저장소의 **Settings > Pages > Source**가 **`GitHub Actions`**로 설정된 환경에 맞춰, 403 권한 에러를 유발하던 외부 액션(`peaceiris/actions-gh-pages`)과 불필요한 `/docs` 폴더를 제거하고 **GitHub 공식 표준 아티팩트 배포 워크플로(`.github/workflows/deploy.yml`)**와 **`/Examen_para_terminar_trabajo/` 전용 base 경로**를 적용합니다.

### User Review & Critical Decisions

> [!IMPORTANT]
> 요청하신 5가지 필수 조건과 사용자 확인 사항을 100% 반영한 구성입니다.

- **공식 GitHub Pages 액션 3종 적용**: `actions/configure-pages@v5`, `actions/upload-pages-artifact@v3`, `actions/deploy-pages@v4`를 사용하여 `./dist` 빌드 결과물을 아티팩트로 직접 배포합니다.
- **최상단 권한 명시**: `permissions: contents: read, pages: write, id-token: write`를 워크플로 최상단에 명시하여 403 권한 에러를 원천 차단합니다.
- **Node.js 20 설정**: `actions/setup-node@v4`에서 `node-version: '20'`을 사용합니다.
- **저장소 맞춤형 `base` 경로 자동 분기 (확정)**: GitHub Actions 빌드 환경(`process.env.GITHUB_ACTIONS === 'true'`)에서는 `base: '/Examen_para_terminar_trabajo/'`가 자동 적용되어 GitHub Pages에서 빈 화면 없이 로드되고, AI 스튜디오 개발/미리보기 환경에서는 `'/'`로 동작하여 양쪽 모두 완벽히 호환됩니다.

---

### 1. Overview & Core Concept

- **What It Does**:
  1. `.github/workflows/deploy.yml`을 GitHub 공식 정적 웹앱 아티팩트 배포 방식(단일 워크플로 파일)으로 교체합니다.
  2. 이전에 생성했던 `/docs` 정적 폴더를 깨끗하게 삭제하여 불필요한 브랜치/폴더 충돌을 방지합니다.
  3. `vite.config.ts`에 GitHub 저장소 이름(`/Examen_para_terminar_trabajo/`) 기준의 `base` 경로 설정을 반영합니다.

---

### 2. User Experience & Visual Design

- **Key User Flows**:
  1. 프로젝트가 `main` 브랜치에 Push되면 GitHub Actions가 자동으로 `./dist` 폴더를 빌드합니다.
  2. `actions/upload-pages-artifact@v3`가 `./dist`를 패키징하고, `actions/deploy-pages@v4`가 `gh-pages` 브랜치 푸시 없이 GitHub Pages 서버로 직접 배포합니다.
  3. 배포가 끝나면 `https://yoan-kim.github.io/Examen_para_terminar_trabajo/` 주소에서 모든 기능(발음, 효과음, 폭죽, 오답노트, 고급학습 암기팁)이 정상 작동합니다.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: 외부 브랜치 푸시 액션(`peaceiris`) 완전 제거 및 공식 아티팩트 배포 채택**
  - *Chosen Approach*: `actions/upload-pages-artifact@v3` + `actions/deploy-pages@v4` 조합을 사용합니다.
  - *Why*: `git push origin gh-pages` 과정에서 발생하는 `403 Permission denied` 에러가 구조적으로 발생하지 않으며, GitHub의 `Source: GitHub Actions` 설정과 1:1로 매칭됩니다.
- **Decision 2: 환경 감지형 `base` 경로(`'/Examen_para_terminar_trabajo/'`)**
  - *Chosen Approach*: `base: process.env.GITHUB_ACTIONS ? '/Examen_para_terminar_trabajo/' : '/'`로 설정합니다.
  - *Why*: GitHub Pages 배포본에서는 `/Examen_para_terminar_trabajo/assets/...` 경로를 정확히 가리키고, 로컬 및 AI 스튜디오 미리보기에서는 루트(`/`) 경로를 유지해 두 환경 모두에서 깨짐이 없습니다.

---

### 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────────────────┐
│                .github/workflows/deploy.yml (단일 워크플로)              │
│  • permissions: { contents: read, pages: write, id-token: write }       │
│  • actions/checkout@v4                                                  │
│  • actions/setup-node@v4 (node-version: 20)                             │
│  • npm install --legacy-peer-deps                                       │
│  • npm run build (base: '/Examen_para_terminar_trabajo/' ➔ ./dist)      │
│  • actions/configure-pages@v5                                           │
│  • actions/upload-pages-artifact@v3 (path: './dist')                    │
│  • actions/deploy-pages@v4                                              │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│       https://yoan-kim.github.io/Examen_para_terminar_trabajo/          │
└─────────────────────────────────────────────────────────────────────────┘
```
