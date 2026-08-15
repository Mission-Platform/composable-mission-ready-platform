# 애플리케이션 개발

정식 영어 원문을 기계 지원으로 번역한 문서입니다. 필요 시 사람이 검수하세요. 패키지 이름, 명령, 경로, 기술 식별자는 그대로 둡니다.

> 영어 원문: [docs/application-development.md](../../application-development.md)
> 언어: 한국어 (ko)

이 방법 가이드에서는 애플리케이션을 실행, 테스트 및 배포하는 방법을 설명합니다. `apps/`. 애플리케이션은 재사용 가능하게 구성됩니다.
패키지; 공유 구성요소, 컴포저블, 유틸리티, 구성은 자체 작업공간이 아닌 자체 작업공간에 속합니다.
앱에 복사했습니다.

## 애플리케이션을 선택하세요

| 신청 | 지역개발 | 빌드 | 배포 |
|:---|:---|:---|:---|
| `@mission-platform/docs` | `pnpm --filter @mission-platform/docs dev` | `pnpm --filter @mission-platform/docs build` | 호스팅 작업자를 통해 미리보기 또는 배포 |
| `@mission-platform/website` | `pnpm --filter @mission-platform/website dev` | `pnpm --filter @mission-platform/website build` | `pnpm --filter @mission-platform/website deploy:staging` |
| `@mission-platform/my-care-notes` | `pnpm --filter @mission-platform/my-care-notes dev` | `pnpm --filter @mission-platform/my-care-notes build` | `pnpm --filter @mission-platform/my-care-notes deploy:staging` |
| `@mission-platform/service-monitor` | `pnpm --filter @mission-platform/service-monitor dev` | `pnpm --filter @mission-platform/service-monitor build` | `pnpm --filter @mission-platform/service-monitor deploy:staging` |
| `@mission-platform/storybook` | `pnpm --filter @mission-platform/storybook dev` | `pnpm --filter @mission-platform/storybook build` | 구성된 Storybook/Chromatic 작업 흐름 사용 |

응용 프로그램 패키지는 해당 패키지를 소유합니다. Vite 또는 Wrangler 구성. 달리지 마세요 `wrangler deploy` 재사용 가능한 작업자로부터
패키지에 자체 패키지가 없는 경우 `wrangler.jsonc`.

## 변화를 개발하다

1. 해당 패키지로 대상 애플리케이션을 시작합니다. `dev` 스크립트.
2. 재사용 가능한 변경 사항을 적용하세요. `packages/` 앱별 구성 변경 `apps/<name>/`.
3. 변경된 애플리케이션과 해당 종속성을 빌드합니다.

```bash
   pnpm exec turbo run build --filter @mission-platform/<app>...
   ```

4. 영향을 받은 작업 공간에 대해 테스트, Lint, 스타일 검사 및 형식 지정을 실행합니다.

```bash
   pnpm exec turbo run test lint lint:style format --filter @mission-platform/<app>
   ```

공유 패키지 변경의 경우 교체 `<app>` 패키지 이름과 용도 `...` 종속 작업 공간이 필요한 경우
빌드 그래프에 포함됩니다.

## 정적 문서 및 웹사이트 빌드

문서 및 웹사이트 애플리케이션이 사용하는 것 `vite-ssg`. 프로덕션 빌드는 소스 콘텐츠에서 정적 경로를 생성하고
로케일 카탈로그. 패키지의 생성된 출력을 확인하십시오. `preview` 스크립트:

```bash
pnpm --filter @mission-platform/docs build
pnpm --filter @mission-platform/docs preview

pnpm --filter @mission-platform/website build
pnpm --filter @mission-platform/website preview
```

문서 마크다운을 아래에 유지하세요. `docs/` 및 소유 로케일 카탈로그의 웹 사이트 메시지. 1초도 추가하지 마세요
두 소스 중 하나의 렌더링 시간 복사본입니다.

## Cloudflare 개발 및 배포

다음이 포함된 애플리케이션 `wrangler.jsonc` 환경 인식 명령을 노출합니다.

```bash
pnpm --filter @mission-platform/website cf:dev
pnpm --filter @mission-platform/my-care-notes cf:dev
pnpm --filter @mission-platform/service-monitor dev

pnpm --filter @mission-platform/website deploy:staging
pnpm --filter @mission-platform/my-care-notes deploy:staging
pnpm --filter @mission-platform/service-monitor deploy:staging
```

사용 `wrangler secret put` 비밀을 위해. 바인딩 및 비밀이 아닌 기본값을 유지합니다. `wrangler.jsonc`, 그리고 확인
배포하기 전에 선택한 환경.

## 관련 가이드

- [개발 설정](development-setup.md)
- [작업공간 구조](workspace-structure.md)
- [시스템 구축](build-system.md)
- [작업자 구성](configs/workers-config.md)
- [테스트](testing.md)
