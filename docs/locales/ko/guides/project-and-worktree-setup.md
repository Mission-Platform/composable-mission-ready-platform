# 프로젝트 보드 및 Git 워크트리 워크플로 가이드

정식 영어 원문을 기계 지원으로 번역한 문서입니다. 필요 시 사람이 검수하세요. 패키지 이름, 명령, 경로, 기술 식별자는 그대로 둡니다.

> docs/guides/project-and-worktree-setup.md: [docs/guides/project-and-worktree-setup.md](../../../guides/project-and-worktree-setup.md)
> 언어: 한국어 (ko)

**버전:** 2.0.0
**저장소:** `Mission-Platform/composable-mission-ready-platform`
**이정표:**

- 마일스톤 #1: Flint 아키텍처 및 런타임 개선
- 마일스톤 #2: UI 구성요소 플랫폼 개선 및 개선
- 마일스톤 #3: Fabrica 브랜드 변경 및 다중 프레임워크 현대화

아래 작업 트리 및 보드 테이블은 실시간 상태가 아닌 저장소 스냅샷입니다. 분기, 문제 및 풀 요청 확인
의존하기 전에 GitHub에 상태를 명시하세요.

---

## 1. 건축적 동기 부여 및 유틸리티 중심 모델

광범위한 컴파일러 도구와 여러 자율 에이전트를 갖춘 높은 처리량의 다중 프레임워크 TypeScript 모노레포에서 개발 속도를 최대화하고 마찰을 최소화하는 것은 두 가지 핵심 운영 기능에 따라 달라집니다.

1. **Zero-Copy APFS 클론 및 공유 캐싱을 갖춘 격리된 Git 작업 트리:**
   - **격리:** 개발자와 자율 하위 에이전트는 작업 디렉터리를 더럽히거나 분기를 교환하거나 숨김 상태를 잃지 않고 전용 분기에서 병렬 작업 스트림을 실행합니다.
   - **APFS 쓰기 시 복사:** Node 모듈은 macOS APFS(`cp -cR`)를 통해 즉시 복제되므로 추가 디스크 할당이 없고 설정 시간이 1초 미만으로 보장됩니다.
   - **공유 Turbo 캐시:** `.turbo/cache`은 저장소 루트에서 초기화되고 연결된 모든 작업 트리에서 공유되므로 중복된 빌드 및 테스트 주기가 제거됩니다.
   - **언어 서버 패리티:** `agent-lsp.json`는 각 작업 트리에 자동으로 동기화되므로 코드 인텔리전스와 IDE 도구가 즉시 작동합니다.

2. **결정론적 프로젝트 보드 오케스트레이션:**
   - **The Board**에서 5단계 칸반 수명주기(`Backlog` $\rightarrow$ `Ready` $\rightarrow$ `In Progress` $\rightarrow$ `In Review` $\rightarrow$ `Done`) 전반에 걸쳐 아키텍처 이정표, 문제, 우선 순위 및 상태를 추적합니다.
   - 문제는 풀 요청을 통해 `main`에 병합된 한 번만 **완료**로 엄격하게 표시됩니다.

---

## 2. 활성 작업 트리 토폴로지

| 작업트리 경로 | 지점 | 적극적 초점 및 이슈 | 상태 |
| :--------------------------------------------- | :-------------------------------- | :--------------------------------------------------------------------------------------- | :------- |
| `composable_mission_ready_platform` | `chore/full-build-and-tooling` | Monorepo 기본 작업공간, 툴링, CI 오케스트레이션 | `MAIN` |
| `composable_mission_ready_platform_components` | `feat/ui-components-improvements` | 핵심 UI 구성 요소: 테이블, 탭, TreeView, SplitPane, Multiselect(#51~#56, #60, PR #63) | `LINKED` |
| `composable_mission_ready_platform_float` | `feat/ui-float-modernization` | 플로트 및 오버레이: CSS 앵커 위치 폴백 및 대화상자/모달 통합(#57, #61) | `LINKED` |
| `composable_mission_ready_platform_forms` | `feat/ui-forms-context` | Forms: Zod/Valibot 스키마 유효성 검사가 포함된 컨텍스트 기반 `ForgeForm` 컨테이너(#58) | `LINKED` |
| `composable_mission_ready_platform_select` | `feat/ui-select-combobox` | 선택: 비동기 검색 콤보 상자, 디바운스 및 로드 상태(#59) | `LINKED` |
| `composable_mission_ready_platform_content` | `feat/ui-content-editor` | 콘텐츠: 더 이상 사용되지 않는 `execCommand`를 제거하기 위해 `ForgeWysiwygEditor`을 현대화(#62) | `LINKED` |
| `composable_mission_ready_platform_flint` | `feat/flint-architecture` | Flint 컴파일러 및 런타임: 스위스 테이블, SIMD, SonIR, 선형 정규식(#43–#45, #48) | `LINKED` |

---

## 3. Git 작업트리 관리 명령

자동화된 작업 트리 수명 주기 도구는 `scripts/worktree-manager.ts` 및 루트 `package.json` 스크립트를 통해 제공됩니다.

아래 `pnpm worktree:*` 명령은 해당 `scripts/worktree-manager.ts`에 대한 편의 별칭입니다.
명령. 직접 스크립트 형식은 패키지 관리자 별칭을 사용할 수 없는 경우의 정식 대체입니다.

```bash
# 1. List all active worktrees and their readiness state (LSP, dependencies, clean status)
pnpm worktree:list

# 2. Provision a new isolated worktree branching cleanly from origin/main
pnpm worktree:create <branch-name> [optional-target-path] [optional-base-ref]

# 3. Synchronize / setup an existing or linked worktree (Turbo cache, LSP, node_modules)
pnpm worktree:setup [path]

# 4. Safely tear down a clean worktree
pnpm worktree:remove <path> [--force]
```

### 3.1 작업 트리 불변성 및 보호 장치

작업 트리가 프로비저닝되거나 구성되면 다음이 수행됩니다.

- **기본 참조:** 기본적으로 새 작업 트리는 로컬 `HEAD`이 아닌 `origin/main`에서 깔끔하게 분기되어 진행 중인 분기 오염을 방지합니다.
- **APFS 쓰기 시 복사:** macOS에서 `node_modules`는 `pnpm install --frozen-lockfile`를 실행하기 전에 `cp -cR`을 통해 복제되어 추가 디스크 공간 없이 몇 초 만에 설정을 완료합니다.
- **Turborepo 캐시 공유:** `.turbo/cache` 디렉터리가 초기화되어 작업 트리 전체에서 공유됩니다.
- **LSP 구성:** `agent-lsp.json`은 기본 저장소에서 미러링됩니다.
- **업스트림 빌드 프라이밍:** 업스트림 작업공간 빌드 종속성(`turbo run build --filter <target>^...`)을 자동으로 프라이밍하여 정리 상태 테스트 실패를 제거합니다.
- **건전성 확인 구축:** 환경이 완벽하게 작동하는지 확인하기 위해 빠른 테스트 검사가 실행됩니다.

---

## 4. 마일스톤 2: UI 구성 요소 플랫폼 개선("보드")

마일스톤 2 문제(#51~#62)는 구성 요소 라이브러리 전체에서 접근성 준수, 상호 작용 개선 및 기능 패리티를 추적합니다.

### 4.1 이슈 추적 및 보드 상태

| 이슈 | 제목 | 트랙 | 우선순위 | 복잡성 | 보드 스테이지 | 워크트리 / 홍보 |
| :------ | :--------------------------------------------------------------------------------------------- | :------------------- | :------------ | :--------- | :---------- | :--------------------- |
| **#51** | `fix(table): Sortable header keyboard accessibility and sort activation` | 접근성 | P0 - 심각 | 에스 | `In Review` | PR #63(`_components`) |
| **#52** | `fix(tabs): Correct ARIA tab semantics by removing role="tab" from close button` | 접근성 | P0 - 심각 | 에스 | `In Review` | PR #63(`_components`) |
| **#53** | `fix(tree-view): Implement full WAI-ARIA keyboard navigation (ArrowUp, ArrowDown, Home, End)` | 접근성 | P0 - 심각 | 남 | `In Review` | PR #63(`_components`) |
| **#54** | `fix(split-pane): Fix onKeyDown prop casing and add pointer drag resizing` | 상호작용 및 폴란드어 | P1 - 높음 | 남 | `In Review` | PR #63(`_components`) |
| **#55** | `feat(table): Scoped slot cell rendering parity with ForgeVirtualTable` | 데이터 표시 패리티 | P1 - 높음 | 남 | `In Review` | PR #63(`_components`) |
| **#56** | `feat(multiselect): Support tag truncation and collapsed badge (+N more)` | 상호작용 및 폴란드어 | P1 - 높음 | 남 | `In Review` | PR #63(`_components`) |
| **#57** | `feat(float): Add fallback positioning when CSS Anchor Positioning is unsupported` | 오버레이 및 플로트 | P2 - 중간 | 엘 | `Ready` | `_float` |
| **#58** | `feat(forms): Context-driven ForgeForm component with schema validation` | 양식 및 유효성 검사 | P2 - 중간 | XL | `Ready` | `_forms` |
| **#59** | `feat(select): Async search query callback and loading state for ForgeSelect / ForgeCombobox` | 선택 및 콤보박스 | P2 - 중간 | 엘 | `Ready` | `_select` |
| **#60** | `feat(table): Row selection, row expansion, and column pinning in ForgeTable` | 데이터 표시 패리티 | P2 - 중간 | XL | `Ready` | `_components` |
| **#61** | `refactor(float): Unify ForgeDialog and ForgeModal into consolidated overlay primitive` | 오버레이 및 플로트 | P2 - 중간 | 엘 | `Ready` | `_float` |
| **#62** | `refactor(content): Modernize ForgeWysiwygEditor to eliminate deprecated document.execCommand` | 콘텐츠 및 편집자 | P2 - 중간 | XL | `Ready` | `_content` |

모든 문제는 GitHub의 `@Cethric`에 직접 할당됩니다.

---

## 5. 마일스톤 1: 플린트 건축 및 현대화

마일스톤 1 문제(#41~#50)는 컴파일러 코어, SonIR 2.0, 표준 라이브러리 및 런타임 시스템을 추적합니다.

| 이슈 | 제목 | 트랙 | 우선순위 | 복잡성 | 보드 스테이지 |
| :------ | :------------------------------------------------------------------------------------ | :------------------- | :------------ | :--------- | :------------ |
| **#41** | `feat(flint-types): Structural Type Algebra & Generic Monomorphization` | 컴파일러 코어 | P0 - 심각 | XL | `Ready` |
| **#42** | `feat(flint-lsp): Incremental LSP Architecture, Query Caching & Request Cancellation` | 툴링 및 LSP | P0 - 심각 | 엘 | `Ready` |
| **#43** | `feat(flint-stdlib): Swiss Table Hash Map & Set with SIMD Acceleration` | 표준 라이브러리 | P1 - 높음 | 엘 | `In Progress` |
| **#44** | `feat(flint-wasm): WebAssembly v128 SIMD Vectorization & Bulk Memory Operations` | Wasm & SIMD | P1 - 높음 | 엘 | `Ready` |
| **#45** | `feat(flint-sonir): Formal Sea-of-Nodes Schema, Memory SSA, GVN & SCCP` | SonIR 및 최적화 | P2 - 중간 | XL | `In Progress` |
| **#46** | `feat(flint-interop): Native Web IDL Parser & Zero-Copy Host Binding Generator` | 컴파일러 코어 | P2 - 중간 | 엘 | `Backlog` |
| **#47** | `docs(flint): Formal EBNF Language Specification, SonIR Manual & Interactive Docs` | 문서 | P3 - 낮음 | 남 | `In Review` |
| **#48** | `feat(flint-regex): Linear-Time PikeVM/DFA Regex Engine & Polyhedral Bounds Analysis` | 보안 및 경계 | P0 - 심각 | 엘 | `In Review` |
| **#49** | `feat(flint-runtime): Multi-Memory Segregation & O(1) TLSF Dynamic Allocator` | 메모리 및 런타임 | P1 - 높음 | XL | `Backlog` |
| **#50** | `feat(flint-concurrency): JSPI Async Stack-Switching & Wasm Threads with Send/Sync` | 메모리 및 런타임 | P2 - 중간 | XL | `Backlog` |

---

## 6. 마일스톤 3: Fabrica 브랜드 변경 및 다중 프레임워크 현대화

마일스톤 3 문제(#109~#118)는 Fabrica 플랫폼 아키텍처(`Fabrica`, `Lathe`, `Scribe`)로의 4단계 마이그레이션을 추적합니다.

| 이슈 | 제목 | 트랙 | 우선순위 | 복잡성 | 보드 스테이지 |
| :------- | :------------------------------------------------------------------------------------------------------------- | :------------------- | :------------ | :--------- | :---------- |
| **#109** | `refactor(tooling): rename root configs and workspace scopes to @fabrica` | 기초 및 툴링 | P0 - 심각 | 남 | `Ready` |
| **#110** | `refactor(tokens): migrate custom properties from --mp-* to --fb-* and publish @fabrica/tokens` | 디자인 토큰 및 UI | P0 - 심각 | 남 | `Backlog` |
| **#111** | `refactor(core): rename @mission-platform/i18n and @mission-platform/core to @fabrica/*` | 디자인 토큰 및 UI | P0 - 심각 | 남 | `Backlog` |
| **#112** | `refactor(components): rename @mission-platform/components to @fabrica/components and bind to @fabrica/tokens` | 디자인 토큰 및 UI | P0 - 심각 | 엘 | `Backlog` |
| **#113** | `refactor(lathe): migrate Forge multi-framework compiler and target adapters to @fabrica/lathe-*` | 컴파일러 및 어댑터 | P1 - 높음 | XL | `Backlog` |
| **#114** | `refactor(scribe): migrate Flint scanner, SonIR, and Wasm execution engine to @fabrica/scribe-*` | 스캐너 및 런타임 | P1 - 높음 | XL | `Backlog` |
| **#115** | `refactor(extensions): migrate VS Code tooling to Scribe` | 스캐너 및 런타임 | P2 - 중간 | 남 | `Backlog` |
| **#116** | `refactor(apps): update applications and Storybook workbench to consume @fabrica/* packages` | 애플리케이션 및 MCP | P1 - 높음 | 엘 | `Backlog` |
| **#117** | `refactor(mcp): rebrand MCP developer and consumer servers to @fabrica/mcp-*` | 애플리케이션 및 MCP | P1 - 높음 | 남 | `Backlog` |
| **#118** | `docs(rebrand): update documentation, AGENTS.md, architectural guides, and website content to Fabrica` | 문서 | P2 - 중간 | 엘 | `Backlog` |

브랜드 변경 문제 사양은 아래 `project:*` 명령에서 참조하는 GitHub 프로젝트에서 유지 관리됩니다.
이 문서에는 해당 백로그의 Live Copy가 포함되어 있지 않습니다.

---

## 7. GitHub 프로젝트 및 보드 CLI 자동화

프로젝트 관리는 `scripts/github-project-manager.ts` 및 루트 `package.json` 스크립트를 통해 조정됩니다.

```bash
# 1. View current project status and board stage mapping
pnpm project:status [components|flint|fabrica|all]

# 2. Export deterministic project plans (docs/ui-components-project-plan.json, docs/flint-project-plan.json & docs/fabrica-project-plan.json)
pnpm project:plan

# 3. Synchronize items and column transitions on "The Board"
pnpm project:board "The Board"

# 4. Provision or configure GitHub Project v2 via GraphQL
pnpm project:setup [components|flint|fabrica]
```

### 7.1 GitHub 인증 범위 설정

CLI를 통해 GitHub 프로젝트 v2 보드(`The Board`)를 업데이트하려면 GitHub OAuth 토큰에 `project` 또는 `read:project` 권한 범위가 포함되어야 합니다.

터미널에서 실행하세요:

```bash
gh auth refresh -s project,read:project
```

또는 프로젝트 권한이 있는 개인 액세스 토큰을 설정하세요.

```bash
export GITHUB_TOKEN="ghp_your_token_with_project_scope"
```

일단 승인되면 `pnpm project:board "The Board"`은 모든 열 전환을 GitHub 프로젝트 v2에 직접 자동으로 동기화합니다.
