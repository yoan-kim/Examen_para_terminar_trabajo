# GitHub Pages 자동 배포 디버깅 및 최적화 계획

GitHub Pages 배포 시 발생하던 빌드 실패(`npm ci` / 패키지 의존성 충돌 / Node 버전 호환성 오류)와 배포 후 빈 화면(404 에셋 경로 오류) 문제를 근본적으로 해결하여, GitHub에 푸시(Push)만 하면 즉시 자동으로 배포되도록 구성합니다.

### User Review & Critical Decisions

> [!IMPORTANT]
> 사용자 답변을 통해 확정된 GitHub Pages 배포 설정입니다.

- **오류 없는 GitHub Actions 자동 배포 워크플로 생성 (확정)**: 기존에 에러를 일으키던 요소(`npm ci` 락파일 충돌, Node 버전 미달, 피어 의존성 에러)를 모두 해결한 새 **`.github/workflows/deploy.yml`** 파일을 프로젝트 내에 생성합니다.
- **상대 경로(`base: './'`) 빌드 설정 (확정)**: 저장소 이름(`Examen_para_terminar_trabajo` 등)이나 대소문자·경로 구조에 상관없이 모든 JS/CSS 리소스가 정상 로드되도록 Vite 빌드 기본 경로를 **`./` (상대 경로)**로 설정합니다.

---

### 1. Overview & Core Concept

- **What It Does**:
  1. **Vite 상대 경로(`base: './'`) 적용**: `https://<아이디>.github.io/<저장소이름>/` 형태의 서브경로에서 정적 파일(`index.js`, `index.css`)을 찾지 못해 하얀 빈 화면이 나오는 현상을 방지합니다.
  2. **무결점 `.github/workflows/deploy.yml` 탑재**:
     - Vite 8 요구사항을 충족하는 **Node.js 22** 환경 사용
     - `package-lock.json` 유무와 무관하게 절대 실패하지 않는 **`npm install --legacy-peer-deps`** 사용
     - GitHub 공식 Pages 배포 액션(`actions/configure-pages@v5`, `actions/upload-pages-artifact@v3`, `actions/deploy-pages@v4`) 및 권한(`pages: write`, `id-token: write`) 자동 구성
  3. **Jekyll 우회(`.nojekyll`) 및 불필요한 대용량 첨부 이미지 정리**: GitHub Pages가 특수 파일명을 무시하지 않도록 `.nojekyll` 파일을 포함하고, 빌드에 불필요한 임시 스크린샷 에셋을 정리해 빌드 속도를 높입니다.

---

### 2. User Experience & Visual Design

- **Key User Flows (배포 완료 후 절차)**:
  1. 코드가 GitHub 저장소(`main` 브랜치)에 푸시되면 `.github/workflows/deploy.yml`이 자동 실행됩니다.
  2. GitHub 저장소의 **[Settings] ➔ [Pages]** 메뉴에서 **Build and deployment > Source**를 **`GitHub Actions`**로 한 번만 선택해 두면, 약 30~40초 내에 배포가 완료되어 GitHub Pages 주소로 즉시 접속할 수 있습니다.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: `npm ci` 대신 `npm install --legacy-peer-deps` 채택**
  - *Chosen Approach*: 워크플로 내 의존성 설치 명령을 `npm install --legacy-peer-deps`로 지정합니다.
  - *Why*: 기본 템플릿의 `npm ci`는 `package-lock.json`이 없거나 미세한 버전 차이가 있을 때 즉시 에러(`exit code 1`)를 내며 중단됩니다. `npm install --legacy-peer-deps`를 사용하면 언제나 안정적으로 패키지를 설치합니다.
- **Decision 2: Node.js 22 LTS 고정**
  - *Chosen Approach*: GitHub Actions 러너의 Node 버전을 `22`로 명시합니다.
  - *Why*: 프로젝트의 최신 Vite 8 및 플러그인들은 Node 20.19+ / 22 환경을 요구하므로, 구버전 Node(18 등)로 인해 발생하던 빌드 에러를 원천 차단합니다.

---

### 4. Technical Architecture & Data Strategy

```
┌──────────────────────────────────────────────────────────────────────┐
│                  GitHub Repository (main 브랜치 Push)                 │
└──────────────────────────────────┬───────────────────────────────────┘
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────────────────┐
│            GitHub Actions (.github/workflows/deploy.yml)             │
│  1. Checkout Repository (actions/checkout@v4)                        │
│  2. Setup Node.js 22 (actions/setup-node@v4)                         │
│  3. Install Dependencies (npm install --legacy-peer-deps)            │
│  4. Build Vite App with base: './' (npm run build ➔ ./dist)          │
│  5. Upload & Deploy to GitHub Pages (actions/deploy-pages@v4)        │
└──────────────────────────────────┬───────────────────────────────────┘
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────────────────┐
│        Live GitHub Pages (https://yoan-kim.github.io/저장소이름/)     │
└──────────────────────────────────────────────────────────────────────┘
```
