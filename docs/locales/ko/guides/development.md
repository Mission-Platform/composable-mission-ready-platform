# 개발 가이드

정식 영어 원문을 기계 지원으로 번역한 문서입니다. 필요 시 사람이 검수하세요. 패키지 이름, 명령, 경로, 기술 식별자는 그대로 둡니다.

> docs/guides/development.md: [docs/guides/development.md](../../../guides/development.md)
> 언어: 한국어 (ko)

## Forge 빌드 수명주기

Forge 패키지는 Vite 및 tsdown과 동일한 지연 세션 계약을 사용합니다. 유지하다
호출자 소유 프레임워크 또는 CMS 출력을 구성하여 명시적인 대상 선택
그런 다음 어댑터 플러그인을 네이티브 번들러 구성에 연결합니다.

```ts
import { tsdownForgeComponentPlugins } from "@mission-platform/vite-plugin-forge";
import { forgeVueFramework } from "@mission-platform/forge-plugin-vue";
import { defineTsdownLibrary } from "@mission-platform/tsdown-config";

export default defineTsdownLibrary({
  rootDir: import.meta.dirname,
  entry: "src/index.ts",
  plugins: tsdownForgeComponentPlugins({
    rootDir: import.meta.dirname,
    componentsModule: `${import.meta.dirname}/src/components/index.ts`,
    frameworks: [forgeVueFramework()],
    name: "Components",
  }),
});
```

구성 평가는 의도적으로 저렴합니다. 그래프 검색, 소스
생성, 네이티브 번들링, 선언 및 게시는 번들러에서 시작됩니다.
수명주기 후크. 공유 세션은 선택한 전체에 걸쳐 중립 분석을 재사용합니다.
감시 모드에서 변경 사항이 보고되면 역종속 항목을 대상으로 삼고 무효화합니다.

모든 대상은 격리된 시도 디렉터리에 쓰고 다음 이후에만 승격됩니다.
매니페스트, 선언, 맵, 자산 및 생성된 모듈의 유효성을 검사합니다. 에이
실패, 취소 또는 불완전한 빌드는 해당 시도만 제거하고 보존합니다.
마지막으로 성공한 `dist/<target>` 트리 및 형제 대상.

후크의 경우 `tsdownForgeHookPlugins`을 사용하십시오. CMS 투영용
`@mission-platform/forge-cms-plugin-api`의 `tsdownForgeCmsPlugins`. 하지 마십시오
구성을 구성하는 동안 호출 생성 도우미를 소개하지 않습니다.
프레임워크 스위치 테이블을 중립 컴파일러로 전환합니다.

## 확인

대표적인 소비자 빌드 전에 집중된 Forge 및 CMS 제품군을 실행하십시오.

```bash
pnpm --filter @mission-platform/vite-plugin-forge test
pnpm --filter @mission-platform/forge-cms-plugin-api test
pnpm --filter @mission-platform/vite-plugin-forge build
```

Forge 제품군은 지연 수명 주기 실행, 결정적 캐시 키,
역무효화, 동시 대상 조정, 선언/CSS 아티팩트
게시, 매니페스트 안전 및 게시된 대상 디렉터리의 롤백.
