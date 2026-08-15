# 패키지 개발

정식 영어 원문을 기계 지원으로 번역한 문서입니다. 필요 시 사람이 검수하세요. 패키지 이름, 명령, 경로, 기술 식별자는 그대로 둡니다.

> 영어 원문: [docs/package-development.md](../../package-development.md)
> 언어: 한국어 (ko)

이 가이드에서는 Mission Platform 모노레포 내에서 재사용 가능한 패키지를 생성, 개발 및 게시하는 방법을 설명합니다.
패키지는 플랫폼의 기본 구성 요소이며 다음 위치에 있습니다. `packages/` 디렉토리를 통해 관리되며
pnpm 작업 공간 및 Turborepo.

## 새 패키지 만들기

패키지를 생성하는 권장 방법은 Mission Platform Developer MCP 도구를 사용하는 것입니다.
구성, 스크립트 및 폴더 구조는 플랫폼의 표준을 따릅니다.

### 1. MCP를 사용한 비계

사용 `scaffold_package` 뼈대를 생성하는 도구입니다.

```bash
# Example: Creating a new 'date-utils' package
# The tool defaults to a dry-run; set apply=true to write files
scaffold_package(name="date-utils", description="Shared date manipulation utilities", apply=true)
```

이는 규칙 준수를 생성합니다. `packages/date-utils/` 다음을 포함하는 디렉토리:

- `package.json` 작업 공간에 즉시 사용 가능한 스크립트 및 공유 구성을 사용합니다.
- `tsconfig.json` 플랫폼 기본값을 확장합니다.
- `vite.config.ts` 최적화된 빌드를 위해
- `src/index.ts` 배럴 파일.
- `llms.txt` AI 지원 문서용.

### 2. 수동 설정(선택 사항)

MCP 도구를 사용하지 않는 경우 다음 사항을 확인하세요. `package.json` 사용 [pnpm 카탈로그](https://pnpm.io/catalogs) 에 대한
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
├── llms.txt                        # Technical overview for LLMs
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## 개발 워크플로우

### 저작 규칙

1. **TypeScript Everywhere**: 모든 소스 코드가 있어야 합니다. `.ts` 또는 `.tsx` (사용 `@mission-platform/forge`).
2. **프레임워크 중립성**: 프레임워크에 구애받지 않는 논리를 선호합니다. Forge JSX에서 대상으로 구성 요소를 한 번 작성해야 합니다.
   여러 프레임워크.
3. **격리**: 패키지를 다음에서 가져오면 안 됩니다. `apps/`.
4. **테스트**: 모든 유닛(컴포저블, 스토어, 유틸리티, 구성 요소)은 같은 위치에 있어야 합니다. `.spec.ts` 파일.

자세한 작성 지침은 다음을 참조하세요.

- [원자 구성 요소 설계](atomic-component-design.md)
- [구성 가능한 저작](composable-authoring.md)
- [스토어 작성](store-authoring.md)
- [저작 활용](util-authoring.md)

### 건물

다음을 사용하여 패키지를 빌드합니다. Turbo 종속성이 올바른 순서로 빌드되었는지 확인하려면 다음을 수행하세요.

```bash
pnpm exec turbo run build --filter @mission-platform/<name>
```

### 테스트

다음을 사용하여 테스트 실행 Vitest:

```bash
pnpm exec turbo run test --filter @mission-platform/<name>
```

## 문서(`llms.txt`)

모든 패키지에는 `llms.txt` 루트에 있는 파일입니다. 이 파일은 다음에 대한 간결하고 기술적인 설명을 제공합니다.
패키지의 API, 구성 요소 및 동작을 분석하여 AI 보조자가 패키지를 더 잘 이해하고 사용할 수 있도록 합니다.

- **제목**: 범위가 지정된 패키지 이름을 사용합니다.
- **구성 요소/API**: 해당 속성 및 책임이 포함된 사용 가능한 기호의 테이블 또는 목록입니다.
- **예**: 일반적인 사용 사례에 대한 짧은 코드 조각입니다.

## 출판

미션 플랫폼은 [변경 세트](https://github.com/changesets/changesets) 버전 관리 및 게시용.

1. **변경 세트 추가**: 변경 후 다음을 실행합니다.
```bash
   pnpm changeset
   ```
   패키지와 변경 유형(패치, 마이너, 메이저)을 선택합니다.
2. **변경 세트 커밋**: 생성된 내용을 커밋합니다. `.changeset/*.md` 파일.
3. **버전 및 게시**: CI/CD는 실제 게시를 처리하지만 다음을 사용하여 로컬에서 버전을 미리 볼 수 있습니다.
```bash
   pnpm changeset version
   ```
