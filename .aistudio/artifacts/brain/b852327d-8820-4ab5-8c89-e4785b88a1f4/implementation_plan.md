# GitHub Pages 403 권한 거부(Permission Denied) 해결 및 이중 배포 지원 계획

`peaceiris/actions-gh-pages@v4`가 `gh-pages` 브랜치에 푸시할 때 발생한 **`403 Permission denied to github-actions[bot]`** 에러를 해결하기 위해, 워크플로에 명시적 쓰기 권한(`contents: write`)을 부여하고, 동시에 GitHub Actions 없이도 `main` 브랜치에서 즉시 배포할 수 있는 **`/docs` 프로덕션 빌드 폴더**까지 함께 생성합니다.

### User Review & Critical Decisions

> [!IMPORTANT]
> 사용자 선택에 따라 아래 두 가지 해결책을 모두 적용합니다.

- **해결책 1 — 워크플로 쓰기 권한(`contents: write`) 명시**: `.github/workflows/deploy.yml` 최상단 및 Job 레벨에 `permissions: contents: write`를 부여하여 `github-actions[bot]`이 `gh-pages` 브랜치에 403 에러 없이 커밋·푸시할 수 있도록 수정합니다.
- **해결책 2 — `/docs` 폴더에 완성된 빌드 결과물 직접 포함**: 프로젝트를 미리 빌드하여 `/docs` 폴더(`index.html`, 컴파일된 JS/CSS 번들, `.nojekyll`)를 저장소에 함께 포함시킵니다. 만약 GitHub 저장소에서 Actions를 아예 끄고 `Deploy from a branch (main / docs)`를 선택하더라도 1초 만에 바로 사이트가 열립니다.

---

### 1. Overview & Core Concept

- **Why the 403 Error Happened**:
  - GitHub의 기본 보안 설정상 `GITHUB_TOKEN`(`github-actions[bot]`)은 저장소 읽기 권한(`contents: read`)만 가지며, `gh-pages` 브랜치에 새 커밋을 푸시(`git push origin gh-pages`)하려면 반드시 **`contents: write`** 권한이 필요합니다.
- **What This Fix Delivers**:
  1. 워크플로 파일(`.github/workflows/deploy.yml`)에 `contents: write`, `pages: write`, `id-token: write` 권한을 모두 부여하고, `peaceiris/actions-gh-pages@v4`와 공식 GitHub Pages 배포가 모두 권한 에러 없이 통과하도록 구성합니다.
  2. 빌드 스크립트 실행 시 `dist`뿐만 아니라 `/docs` 폴더에도 최신 프로덕션 빌드 파일을 생성하여, 브랜치 직접 배포(`main` ➔ `/docs` 또는 `gh-pages` ➔ `/root`) 어느 쪽을 선택하든 즉시 작동하게 만듭니다.

---

### 2. User Experience & Visual Design

- **Key User Flows (GitHub에서 확인하실 2가지 방법 중 택1)**:
  - **방법 A (기존처럼 `gh-pages` 브랜치로 자동 배포할 때)**:
    1. 코드 푸시 시 `.github/workflows/deploy.yml`의 `contents: write` 권한으로 `gh-pages` 브랜치가 자동 생성·업데이트됩니다.
    2. 만약 GitHub 저장소 자체 설정에서 쓰기 권한이 잠겨 있다면: **[Settings] ➔ [Actions] ➔ [General]** 하단의 **Workflow permissions**에서 **`Read and write permissions`**를 체크하고 Save를 누르면 403 에러가 100% 사라집니다.
  - **방법 B (Actions를 아예 쓰지 않고 바로 배포할 때)**:
    1. **[Settings] ➔ [Pages]**에서 **Source**를 `Deploy from a branch`로 두고, Branch를 **`main` / `/docs`**로 선택 후 Save를 누르면 Actions 실행 없이도 즉시 배포가 완료됩니다.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: `contents: write` 권한 + `peaceiris/actions-gh-pages@v4` 호환 구성**
  - *Chosen Approach*: 워크플로에 `permissions: contents: write`를 명시하여 `github-actions[bot]`에게 브랜치 푸시 권한을 부여합니다.
  - *Why*: 스크린샷의 `remote: Permission to ... denied to github-actions[bot] (403)` 오류를 직접적으로 해결합니다.
- **Decision 2: `/docs` 정적 빌드 폴더 동시 제공**
  - *Chosen Approach*: `vite build` 결과물을 `/docs` 폴더에도 함께 생성해 커밋에 포함합니다.
  - *Why*: 사용자가 GitHub Actions 설정을 건드리지 않고 브랜치 직접 배포(`main` / `/docs`)로 전환하더라도 빈 화면 없이 완벽히 동작하도록 보장합니다.

---

### 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     프로젝트 빌드 및 GitHub Push                         │
├───────────────────────────────────┬─────────────────────────────────────┤
│ 경로 1: GitHub Actions 자동 배포   │ 경로 2: Actions 없는 직접 배포       │
│ (.github/workflows/deploy.yml)    │ (저장소 내 /docs 정적 빌드 폴더)      │
│ • permissions: contents: write    │ • 이미 컴파일된 index.html + assets │
│ • peaceiris/actions-gh-pages@v4   │ • Settings > Pages > main /docs 선택│
│ • gh-pages 브랜치에 403 없이 Push  │ • 빌드 대기이나 에러 없이 즉시 작동  │
└───────────────────────────────────┴─────────────────────────────────────┘
```
