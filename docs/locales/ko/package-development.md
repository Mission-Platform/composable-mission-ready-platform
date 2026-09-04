# 패키지 개발

정식 영어 원문을 기계 지원으로 번역한 문서입니다. 필요 시 사람이 검수하세요. 패키지 이름, 명령, 경로, 기술 식별자는 그대로 둡니다.

> docs/package-development.md: [docs/package-development.md](../../package-development.md)
> 언어: 한국어 (ko)

이 가이드에서는 Mission Platform 모노레포 내에서 재사용 가능한 패키지를 생성, 개발 및 게시하는 방법을 설명합니다.
패키지는 `packages/` 디렉토리에 상주하며 다음을 통해 관리되는 플랫폼의 기본 구성 요소입니다.
pnpm 작업공간 및 Turborepo.

## 새 패키지 만들기

패키지를 생성하는 권장 방법은 Mission Platform Developer MCP 도구를 사용하는 것입니다.
구성, 스크립트 및 폴더 구조는 플랫폼의 표준을 따릅니다.

### 1. MCP를 사용한 비계

`scaffold_package` 도구를 사용하여 뼈대를 생성합니다.

```bash
# Example: Creating a new 'date-utils' package
# The tool defaults to a dry-run; set apply=true to write files
scaffold_package(name="date-utils", description="Shared date manipulation utilities", apply=true)
```

그러면 다음을 사용하여 규칙을 준수하는 `packages/date-utils/` 디렉터리가 생성됩니다.

- 작업 공간에 즉시 사용 가능한 스크립트 및 공유 구성을 갖춘 `package.json`.
- `tsconfig.json`은 플랫폼 기본값을 확장합니다.
- 최적화된 빌드를 위한 `vite.config.ts`.
- `src/index.ts` 배럴 파일.
- AI 지원 문서용 `llms.txt`.

### 2. 수동 설정(선택 사항)

MCP 도구를 사용하지 않는 경우 `package.json`이 사용하는지 확인하십시오. [pnpm 카탈로그](https://pnpm.io/catalogs)
종속성 관리를 수행하고 범위 지정 명명 규칙을 따릅니다.

```json
{
  "name": "@mission-platform/your-package-name",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "build": "pnpm exec turbo run build --filter @mission-platform/your-package-name",
    "test": "vitest run",
    "lint": "eslint .",
    "format": "prettier --check ."
  },
  "devDependencies": {
    "@mission-platform/eslint-config": "workspace:*",
    "@mission-platform/prettier-config": "workspace:*"
  }
}
```

## 패키지 구조

각 패키지는 엄격한 내부 레이아웃을 따릅니다. 코드 단위(구성요소, 컴포저블, 저장소 또는 유틸리티)는 다음 위치에 있어야 합니다.
동일한 위치에 테스트가 있는 자체 명명된 하위 디렉터리.

```text
packages/<name>/
├── src/
│   ├── components/                 # Atomic components (atoms, molecules, etc.)
│   │   ├── atoms/
│   │   │   └── forge-button/        # forge-button.tsx + .stories.tsx + .spec.ts
│   │   └── index.ts                # Component re-exports
│   ├── composables/
│   │   └── use-date-format/        # use-date-format.ts + .spec.ts
│   ├── stores/
│   │   └── date-store/             # date-store.ts + .spec.ts
│   ├── utils/
│   │   └── date-validator/         # date-validator.ts + .spec.ts
│   ├── locales/                    # i18n JSON files
│   └── index.ts                    # Package public API (barrel)
├── docs/                           # Package-owned guides and generated API reference
│   └── reference/generated/        # Regenerated during prebuild
├── llms.txt                        # Technical overview for LLMs
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## 스타일이 있는 패키지의 Stylelint

`CSS`, `SCSS` 또는 `Vue` 스타일 블록을 포함하는 패키지는 Stylelint 구성과 린트 스크립트를 포함해야 합니다.

```text
packages/<name>/
├── src/
│   └── styles/                     # CSS, SCSS, and Vue style sources
├── stylelint.config.mjs            # Workspace-local ESM configuration
└── package.json                    # Stylelint scripts and devDependencies
```

공유 구성과 직접적인 구문 및 구성 종속성을 `devDependencies`에 추가합니다.

```json
{
  "devDependencies": {
    "@mission-platform/stylelint-config": "workspace:*",
    "postcss-html": "catalog:stylelint",
    "postcss-scss": "catalog:stylelint",
    "stylelint": "catalog:stylelint",
    "stylelint-config-recommended-vue": "catalog:stylelint",
    "stylelint-config-standard-scss": "catalog:stylelint"
  }
}
```

`extends` 항목을 복제하지 말고 `stylelint.config.mjs`에서 공유 구성을 사용합니다.

```js
// stylelint.config.mjs
import baseConfig from '@mission-platform/stylelint-config';

export default { ...baseConfig };
```

작업 공간의 실제 스타일 소스를 포함하는 스크립트를 추가하고 게시 전에 검사를 실행합니다.

```json
{
  "scripts": {
    "lint:style": "stylelint \"src/**/*.{vue,scss,css}\"",
    "lint:style:fix": "stylelint --fix \"src/**/*.{vue,scss,css}\""
  }
}
```

```bash
pnpm exec turbo run lint:style --filter @mission-platform/<name>
```

## 개발 워크플로우

### 저작 규칙

1. **TypeScript Everywhere**: 모든 소스 코드는 `.ts` 또는 `.tsx`(`@mission-platform/forge-jsx` 사용)에 있어야 합니다.
2. **프레임워크 중립성**: 프레임워크에 구애받지 않는 논리를 선호합니다. Forge JSX에서 대상으로 구성 요소를 한 번 작성해야 합니다.
   여러 프레임워크.
3. **격리**: 패키지는 `apps/`에서 가져오면 안 됩니다.
4. **테스트**: 모든 유닛(컴포저블, 저장소, 유틸리티, 구성 요소)에는 동일한 위치에 `.spec.ts` 파일이 있어야 합니다.

자세한 작성 지침은 다음을 참조하세요.

- [원자 구성 요소 설계](atomic-component-design.md)
- [구성 가능한 저작](composable-authoring.md)
- [스토어 작성](store-authoring.md)
- [저작 활용](util-authoring.md)

### 건물

종속성이 올바른 순서로 빌드되도록 Turbo을 사용하여 패키지를 빌드합니다.

```bash
pnpm exec turbo run build --filter @mission-platform/<name>
```

### 테스트

Vitest을 사용하여 테스트를 실행합니다.

```bash
pnpm exec turbo run test --filter @mission-platform/<name>
```

### 라우터 패키지 및 웹 구성 요소 대상

구조화된 경로 대상, 순수 URL 도우미 및 중립 컴파일러 마커에는 `@mission-platform/router`을 사용하세요. 공유됨
패키지는 애플리케이션 경로를 정의하거나 등록해서는 안 됩니다. 애플리케이션은 독립적으로 하나의 Forge 라우터 대상을 선택합니다.
UI 대상, 기본 경로 레코드 및 라우터 인스턴스의 소유권을 유지하고 대상별 런타임을 바인딩합니다.
부트스트랩 중 컨텍스트. 초기 대상은 `@mission-platform/forge-router-vue`, `-react`, `-solid`, `-svelte`,
`-redwood` 및 `-web-components`; 지원되지 않는 기능 조합은 컴파일러 진단으로 유지되어야 합니다.

프레임워크가 없는 패키지 또는 앱의 경우 빌드 및 TypeScript 구성 모두에서 Forge Web Components 조건을 선택합니다.

```ts
import { frameworkResolveConditions } from "@mission-platform/vite-config";

export default {
  resolve: { conditions: frameworkResolveConditions("web-component") },
};
```

웹 구성 요소 애플리케이션의 경우 `@mission-platform/forge-router-web-components/runtime`에서 런타임을 가져오고 호출합니다.
`registerRouterElements()`을 한 번, 앱 소유 라우터를 생성한 후 `setForgeRouter(appRouter)`를 호출하고 구조화를 전달합니다.
`to` 값은 DOM 속성으로 사용되며 사전 렌더링/테스트에서는 `MpMemoryHistory`를 사용합니다. 재사용 가능한 라우터를 추가하는 패키지
요소 또는 변경 웹 구성 요소 동작은 `src/**/*.stories.ts` 아래에 중립 스토리를 추가하고 대상을
웹 구성요소 스토리북 워크벤치.

## 문서(`llms.txt`)

모든 패키지의 루트에는 `llms.txt` 파일이 포함되어 있습니다. 이 파일은 다음에 대한 간결하고 기술적인 설명을 제공합니다.
패키지의 API, 구성 요소 및 동작을 분석하여 AI 도우미가 패키지를 더 잘 이해하고 사용할 수 있도록 합니다.

- **제목**: 범위가 지정된 패키지 이름을 사용합니다.
- **구성 요소/API**: 해당 속성 및 책임이 포함된 사용 가능한 기호의 테이블 또는 목록입니다.
- **예**: 일반적인 사용 사례에 대한 짧은 코드 조각입니다.

## 패키지 문서 소유권

패키지별 설치, 사용법, 제한 사항, 기여자 워크플로 및 API 참조 페이지는
저장소 전체 `docs/` 트리가 아닌 패키지의 `docs/` 디렉터리입니다. 문서 사이트는 이러한 파일을 직접 수집하고
`/packages/integrations/barcode/index` 또는 `/packages/tooling/configs/eslint-config/index`과 같은 안정적인 패키지 네임스페이스에 게시합니다.
프로젝트 전반의 개념, 아키텍처, 작업 공간 워크플로우 및 패키지 간 문제 해결은 루트 `docs/`에 남아 있습니다.

생성된 API 페이지는 `docs/reference/generated/` 아래에 있으며 패키지 `prebuild` 후크에 의해 새로 고쳐집니다. 편집하지 마세요
해당 파일을 수동으로. 사이트를 통해 패키지 문서를 미리 보려면 docs app 빌드를 실행하거나 전체 작업공간을 사용하세요.
문서 앱 README에 설명된 추출기입니다.

## 출판

미션 플랫폼은 [변경 세트](https://github.com/changesets/changesets)을 사용하여 버전 관리 및 게시를 수행합니다.

1. **변경 세트 추가**: 변경 후 다음을 실행합니다.
```bash
   pnpm changeset
   ```
   패키지와 변경 유형(패치, 마이너, 메이저)을 선택합니다.
2. **변경 세트 커밋**: 생성된 `.changeset/*.md` 파일을 커밋합니다.
3. **버전 및 게시**: CI/CD는 실제 게시를 처리하지만 다음을 사용하여 로컬에서 버전을 미리 볼 수 있습니다.
```bash
   pnpm changeset version
   ```
