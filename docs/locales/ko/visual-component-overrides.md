# 시각적 구성 요소 재정의 계약 및 마이그레이션 인벤토리

정식 영어 원문을 기계 지원으로 번역한 문서입니다. 필요 시 사람이 검수하세요. 패키지 이름, 명령, 경로, 기술 식별자는 그대로 둡니다.

> docs/visual-component-overrides.md: [docs/visual-component-overrides.md](../../visual-component-overrides.md)
> 언어: 한국어 (ko)

상태: 구성 요소 속성 등록 및 Vue 범위 스타일 지원이
구현되었습니다. `properties` 백, 중립 `style` 방출, 같은 위치에 입력됨
`@property` 부분 및 대상 인식 Vue `v-bind()` 낮추기가 적용됩니다.

## 범위 및 감사방법

감사 대상은 다음과 일치하는 전체 세트입니다.

```text
packages/**/src/components/**/*.module.scss
```

현재 감사에서는 **17개 패키지에서 258개의 소스 모듈**을 발견했습니다. 각 모듈에 대해 다음을 수행합니다.
같은 위치에 있는 터치 포인트를 확인했습니다.

- `<component>.tsx` — 중립 JSX 인터페이스 및 루트/래퍼 소유권
- `<component>.module.scss` — 선언, 기존 `--forge-*` 변수,
  `--mp-*` 토큰 적용 범위, 선택기, 의사 클래스 및 미디어 규칙 모든
  구체적인 구성요소 접두사가 붙은 `--forge-*` 참조가 로컬에 대해 확인됩니다.
  등록 부분;
- `<component>.stories.tsx` — 대표적인 Storybook 표면
- `<component>.spec.ts` — 중립 및/또는 대상 렌더링 회귀 범위;
- `index.ts` — 로컬 유형/구성 요소 내보내기 및 패키지 구성 요소
  배럴(`packages/<package>/src/components/index.ts`).

모든 감사된 모듈에는 중립적인 `.tsx` 소스와 함께 배치된 모듈이 있습니다.
`.stories.tsx`. 모든 모듈에는 `index.ts`이 함께 배치되어 있습니다.
`packages/ui/resource-planner/src/components/organisms/forge-resource-planner`;
해당 패키지 배럴은 소스 파일을 직접 내보냅니다. 패키지 수준
따라서 현지 배럴이 수출되는 경우에도 배럴은 수출 접점이 됩니다.
실종.

분류는 의도적으로 보수적입니다.

- **프로토타입** — 이미 중첩된 백/상속 변수 패턴을 구현합니다.
  호환성 참조입니다.
- **기존 의미 변수** — 이미 사용자 정의 속성을 내보냈지만
  값은 `columns`과 같은 의미론적 소품에서 파생됩니다. 중복하지 마세요
  일반 재정의 가방에 들어 있습니다.
- **이전/검토** — 협소하게 소유된 CSS를 노출할 수 있는 시각적으로 함께 배치된 CSS
  구성 요소별 API 결정 후 토큰 지원 제어. 에이
  토큰화된 선언 자체는 이를 공개하는 이유가 아닙니다.
- **제외됨** — 생성된 글리프, 진단, 공급업체/캔버스, 렌더리스 상태,
  또는 이 패스에서 안전한 구성 요소 소유 재정의가 없는 편집자 소유 스타일입니다.

## 계약

### 공공 형태

재정의가 승인된 각 구성 요소는 명명된 인터페이스를 소유합니다. 는
속성은 선택 사항이며 인덱스 서명이 없습니다.

```ts
export interface ComponentProperties {
  readonly "surface-color"?: string;
  readonly "border-width"?: string;
}

export interface ComponentProps {
  readonly properties?: Readonly<ComponentProperties>;
}
```

구체적인 구성 요소 인터페이스는 공개 내보내기로 유지됩니다. 예를 들어
`TypographyProperties`; 글로벌 `CSSProperties` 사전을 도입하지 마십시오.
값에 안정적인 문법이 있는 경우 더 설명적인 별칭을 사용하세요(예:
`TypographyFontFamily` 또는 `TypographyLineHeight`), `string`는 다음과 같은 경우에만 사용합니다.
CSS 문법에는 합법적으로 토큰 참조, `calc()`, 쉼표가 포함됩니다.
브라우저 정의 값. 알 수 없는 키는 TypeScript 초과로 인해 거부되어야 합니다.
재산 점검.

중첩된 키는 원시 CSS 선언이 아닌 구성 요소 소유 개념입니다. 마
`display`, `position`, `content`, 애니메이션 내부 또는
의도한 결정이 이미 의미론적 소품으로 표현된 선언
(`size`, `variant`, `columns`, `rows`, `gap` 및 유사).

### 사용자 정의 속성 이름 및 스타일시트 확인

중첩된 키를 하나의 안정적인 케밥 케이스 사용자 정의 속성으로 변환합니다.

| 중첩된 키 | 사용자 정의 속성 |
| --------------- | --------------------------------- |
| `surface-color` | `--forge-component-surface-color` |
| `border-width` | `--forge-component-border-width` |
| `font-family` | `--forge-typography-font-family` |

구성 요소 슬러그는 공개 CSS 네임스페이스입니다. SCSS 선언은 다음을 해결합니다.
토큰/기본 대체 이전 재정의:

```scss
color: var(--forge-component-surface-color, var(--mp-color-bg-surface));
```

현재 선언에 의미 있는 비토큰 기본값이 있는 경우 이를
마지막 대체(`var(--forge-..., var(--mp-token, 1px))`). 새로 만들지 마세요.
`packages/tokens`에 이미 적용되는 가치에 대한 미션 플랫폼 토큰입니다.

값이 하위 항목과 교차해야 하는 경우 `inherits: true`과 함께 `@property`를 사용합니다.
변형 선택기, 의사 클래스 또는 팝업/래퍼 경계. 넣어
BEM 루트를 소유한 요소에 대한 인라인 사용자 정의 속성 맵. 에 대한
다중 요소 구성 요소를 신뢰할 수 있는 기존 래퍼에 배치하여 모든
후손이 그것을 물려받습니다. 중첩된 Vue 범위 속성에 의존하지 마세요.
렌더 클로저 노드. 래퍼 외부에 렌더링된 포털에는 명시적인
자동으로 전역 변수가 아닌 포털 호스트/전파 결정.

### 선언의 완전성

구성 요소 모듈에서 읽은 모든 구체적인 `--forge-*` 속성에는 다음이 있어야 합니다.
가져온 모듈에 정확히 일치하는 `@property` 등록이 하나만 있고,
공동 배치된 `_forge-<component>-properties.scss` 부분. 등록은 준수합니다
W3C CSS 속성 및 값 API 레벨 1 사양:
잘못된 `initial-value` 없이 `syntax: "*"` 및 `inherits: true`를 사용합니다.
표준 `var(--forge-*, var(--mp-*))` 폴백을 해결할 수 있는 설명자
$O(1)$ 스타일 평가에 가깝습니다. 등록은 구체적인 이름으로 작성됩니다.
해결되지 않은 Sass 보간보다는 여기에는 모든 유한 크기가 포함됩니다.
톤, 상태, 타이포그래피, 팝업, 지도 생성 변형 및 의미론적 앵커
`--forge-logo-columns`, `--forge-stats-columns`,
`--forge-testimonial-columns`, `--forge-grid-columns` 및
`--forge-grid-rows`.

`--forge-*` 선언은 구성 요소-로컬 재정의 메타데이터입니다. 는
`--mp-*` 변수는 `packages/tokens`의 소유로 유지되며
구성 요소 부분에서 다시 선언되었습니다. 반복 가능한 가드는 다음과 같이 제공됩니다.
`pnpm validate:component-properties`; 소스 모듈만 스캔하고 보고합니다.
누락, 중복, 고아 또는 해결되지 않은 정확한 모듈 및 속성
선언.

### 중립 출력 및 우선순위

중립 JSX 출력은 다음에서 생성된 표준 `style` 속성을 사용합니다.
`createForgeComponentStyle(prefix, props.properties)`. 해당 유형은 두 가지를 모두 허용합니다.
플랫폼의 `ForgePropertyBag`를 통한 camelCase 및 kebab-case 키 /
`CSSStyleProperties`(자동 변환 및 접두사 포함):

```ts
import { createForgeComponentStyle, type CSSStyleProperties } from '@mission-platform/forge-jsx';

export interface ButtonProperties {
  readonly primaryGap?: string;
  readonly 'primary-gap'?: string;
  readonly primaryBackgroundDefault?: string;
  readonly 'primary-background-default'?: string;
}

// In component rendering:
const customStyle = createForgeComponentStyle('button', props.properties);
```

정의되지 않은 값은 방출된 객체에서 생략되므로 토큰 대체가 유지됩니다.
활동적입니다. `styles` 속성을 내보내지 마십시오. 중립 런타임의 일부가 아닙니다.
계약을 맺고 이를 낮추지 않는 대상에서는 알 수 없는 DOM 속성이 됩니다.
특별히. 숫자 의미 변수는 기존 `number`을 유지할 수 있습니다.
표현; 입력된 재정의 값은 CSS 문자열이므로 단위, 쉼표, 공백,
`calc()`는 그대로 유지됩니다.

### CSS 캐스케이드 레이어 계층 구조 및 원자 구조

모든 스타일은 명시적이고 결정적인 `@layer` 계층 구조로 구성됩니다.
루트 토큰 계층(`@mission-platform/tokens`)에서 선언됨:

```scss
@layer mp.reset,
       mp.tokens,
       mp.components,
       mp.components.atoms,
       mp.components.molecules,
       mp.components.organisms,
       mp.components.templates,
       mp.content,
       mp.content.atoms,
       mp.content.molecules,
       mp.content.organisms,
       mp.scheduler,
       mp.scheduler.organisms,
       mp.barcode,
       mp.barcode.molecules,
       mp.code-scanner,
       mp.code-scanner.organisms,
       mp.map,
       mp.map.organisms,
       mp.matrix-code,
       mp.matrix-code.molecules,
       mp.qr-code,
       mp.qr-code.molecules,
       mp.breakpoints,
       mp.breakpoints.molecules,
       mp.overrides,
       mp.utilities;
```

구성 요소 스타일시트는 해당 패키지 및 원자에 규칙을 할당합니다.
하위 레이어(예: `@layer mp.components.atoms`, `@layer mp.components.molecules`,
`@layer mp.scheduler.organisms`), 예측 가능한 계단식 우선순위 보장
특이성 충돌 없이.

### `@supports`을 통한 점진적인 성능 향상

복잡한 복합 구성 요소와 무거운 유기체는 최신 브라우저 CSS를 활용합니다.
탄력적이고 우아한 `@supports` 기능 쿼리로 보호되는 기능
저하:

1. **`content-visibility: auto`**: 무거운 작품의 오프스크린 레이아웃 및 페인트 비용
   유기체(`ForgeScheduler`, `ForgeCodeBlock`, `ForgeBarcode`, `ForgeTable`)
   `contain-intrinsic-size`으로 연기됩니다.
2. **컨테이너 쿼리(`@container`)**: 적응형 밀도 및 반응형
   구성 요소 타이포그래피는 다음을 통해 컨테이너 크기에 맞게 조정됩니다.
   `@supports (container-type: inline-size)`.
3. **단일 홉 폴백**: 속성 조회가 얕게 유지됩니다.
   `var(--forge-*, var(--mp-*))` 그래프는 $O(1)$ 근처에서 스타일 재계산을 유지합니다.

우선 순위는 가장 낮은 것부터 가장 높은 것까지입니다: 토큰/테마 대체, 구성 요소
변형/기본 규칙, 의미적 속성 선택, 구성요소 재정의 사용자 정의
속성, 명시적으로 제공된 소비자 인라인 스타일(대상인 경우)
하나를 지원합니다). `className`은 호출자의 클래스 후크로 남아 있으며 규칙을 추가할 수 있습니다.
그러나 인쇄된 가방을 대체하는 것으로 취급되어서는 안 됩니다. 재정의
bag은 선택된 의미 변형을 변경하지 않거나 포커스를 우회하거나 비활성화됩니다.
모션 감소 또는 계단식 레이어 규칙.

React, Svelte, Solid 및 웹 구성 요소 출력은 중립 `style` 맵을 사용합니다.
Vue 기본 템플릿 SFC 스타일 경로만 나중에 해당 경로를 다시 쓸 수 있습니다.
`v-bind('properties.<name>')`에 대한 SCSS 값; Vue 렌더링 폐쇄 폴백 및
Vue이 아닌 모든 스타일시트 경로는 유효한 일반 CSS/SCSS로 유지되어야 합니다.

해당 낮추기의 구현 터치 포인트는 중립 런타임입니다.
`packages/core/forge-jsx/src/runtime/types.ts` 및 `packages/core/forge-jsx/src/runtime/h.ts`의 계약,
기존 중립-Vue 스타일이 낮아졌습니다.
`packages/compiler/plugins/forge-vue/src/transformers/template.ts` 및 공동 위치
`packages/compiler/plugins/forge-vue/src/runtime/styles.ts`의 스타일 조립/방출 및
`packages/compiler/plugins/forge-vue/src/emitters/sfc.ts`. 이 파일은
`style` 값을 입력했습니다. 프레임워크별 `styles` 특성을 추가하면 안 됩니다.

## 프로토타입 및 기존 후보

이는 기존의 맞춤 속성 사이트와 정확히 일치합니다. 그들은 회귀와
의미 체계 API를 가방으로 교체하라는 요청이 아닌 호환성 앵커입니다.

| 구성요소 | 스타일 모듈 | 기존 변수 | 현재 소유자/처분 | 나중에 터치 포인트 |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `ForgeTypography` | `packages/ui/typography/src/components/atoms/forge-typography/forge-typography.module.scss` | 기본, 디스플레이, 변형, 색상, 링크 및 팝업 값을 포함한 완전한 `--forge-typography-*` 표면 | 원기; 타이포그래피 루트 및 잘린 팝업 래퍼를 ​​통해 상속됨 | `forge-typography.tsx`, 로컬 `index.ts`, `.spec.ts`, `.stories.tsx`; 모든 구체적인 이름은 같은 위치에 있는 부분 |
| `ForgeLogoCloud` | `packages/ui/components/src/components/organisms/forge-logo-cloud/forge-logo-cloud.module.scss` | `--forge-logo-columns` | 기존 의미변수; `columns` 및 클램핑 유지 | `forge-logo-cloud.tsx`, 로컬 배럴, 사양, 스토리; 중복된 `properties.columns` 없음 |
| `ForgeStatsSection` | `packages/ui/components/src/components/organisms/forge-stats-section/forge-stats-section.module.scss` | `--forge-stats-columns` | 기존 의미변수; `columns` 유지 | `forge-stats-section.tsx`, 로컬 배럴, 사양, 스토리; 중복된 `properties.columns` 없음 |
| `ForgeTestimonialsSection` | `packages/ui/components/src/components/organisms/forge-testimonials-section/forge-testimonials-section.module.scss` | `--forge-testimonial-columns` | 기존 의미변수; `columns` 유지 | `forge-testimonials-section.tsx`, 로컬 배럴, 사양, 스토리; 중복된 `properties.columns` 없음 |
| `ForgeGridLayout` | `packages/ui/layout/src/components/templates/forge-grid-layout/forge-grid-layout.module.scss` | `--forge-grid-columns`, `--forge-grid-rows` | `columns`/`rows`에서 파생된 기존 의미 변수; 클램핑 및 중단점 동작 유지 | `forge-grid-layout.tsx`, 로컬 배럴, 사양, 스토리; 중복된 그리드 백 없음 |

이제 타이포그래피 프로토타입에는 모든 항목에 대해 완전한 등록 부분이 있습니다.
모든 유한 변형 및
팝업 이름. 중립 JSX 출력은 `style={style}`을 사용하고 형식화된 값을 유지합니다.
`CSSStyleProperties` 확장; 의미론적 타이포그래피 API는 변경되지 않습니다.

## 패키지 수준 재고

아래 목록은 일치하는 258개에 대한 전체 구성 요소 슬러그 인벤토리입니다.
스타일 모듈. 모든 슬러그에 대해 모듈, 중립 소스, 스토리 및 (여기서
현재) 사양은 패키지의 기존 Atom 아래 동일한 디렉터리에 있습니다.
분자, 유기체 또는 템플릿 경로. 첫 번째 패키지 모듈 글로브
열은 스타일 파일의 정확한 경로 사양입니다.

| 패키지 및 정확한 모듈 경로 사양 |   카운트 | 처분 |
| -------------------------------------------------------------------- | ------: | ------------------------------------------------------------------ |
| `packages/integrations/barcode/src/components/**/*.module.scss` |       1 | 생성된 바코드 프리젠테이션 마이그레이션/검토 |
| `packages/ui/breakpoints/src/components/**/*.module.scss` |       1 | 제외된 진단/디버그 프레젠테이션 |
| `packages/integrations/code-scanner/src/components/**/*.module.scss` |       1 | 스캐너 호스트/프레임 프리젠테이션 마이그레이션/검토 |
| `packages/ui/components/src/components/**/*.module.scss` |      84 | 3개의 기존 의미 변수; 81 마이그레이션/검토 |
| `packages/content/content/content/src/components/**/*.module.scss` |      10 | 8 마이그레이션/검토; 2 편집자 소유/제외 |
| `packages/ui/float/src/components/**/*.module.scss` |       8 | 마이그레이션/검토 팝업/포털 상속 우선순위 |
| `packages/ui/forms/src/components/**/*.module.scss` |      28 | 마이그레이션/검토, 제어 의미 보존 |
| `packages/ui/icons/src/components/**/*.module.scss` |     106 | 제외된 생성된 문자 모양 래퍼 |
| `packages/ui/layout/src/components/**/*.module.scss` |       7 | 1개의 기존 의미 변수; 6 마이그레이션/검토 |
| `packages/integrations/map/src/components/**/*.module.scss` |       1 | 제외된 MapLibre/캔버스 호스트 |
| `packages/integrations/matrix-code/src/components/**/*.module.scss` |       1 | 생성된 코드 프리젠테이션 마이그레이션/검토 |
| `packages/integrations/qr-code/src/components/**/*.module.scss` |       1 | 생성된 코드 프리젠테이션 마이그레이션/검토 |
| `packages/ui/resource-planner/src/components/**/*.module.scss` |       1 | 도메인 프레젠테이션 마이그레이션/검토 |
| `packages/core/scheduler/src/components/**/*.module.scss` |       1 | 도메인 프레젠테이션 마이그레이션/검토 |
| `packages/ui/select/src/components/**/*.module.scss` |       3 | 마이그레이션/검토, 선택 의미 유지 |
| `packages/ui/theme/src/components/**/*.module.scss` |       3 | 1개의 마이그레이션/검토; 2개의 렌더리스/상태 제외 |
| `packages/ui/typography/src/components/**/*.module.scss` |       1 | 프로토타입 |
| **합계** | **258** | **141개 마이그레이션/검토, 5개 프로토타입/의미론적 앵커, 112개 제외** |

### 커버리지 신호

다음 신호는 동일한 모듈 스캔에서 나온 것이며 의도적으로
직교. **MP 참조**는 `--mp-*` 참조가 포함된 모듈을 계산합니다. **색상
리터럴**은 색상 함수 또는 16진수를 포함하는 모듈을 계산합니다. **치수
리터럴**은 CSS 길이/백분율 리터럴(포함)을 포함하는 모듈을 계산합니다.
의도적인 0/뷰포트 값); **Forge vars**는 다음을 포함하는 모듈을 계산합니다.
기존 `--forge-*` 변수; **토큰 신호 없음**은 다음을 포함하는 모듈을 계산합니다.
`--mp-*`도 아니고 `--forge-*`도 아닙니다. 이는 자동 API가 아닌 분류 신호입니다.
결정.

| 패키지 | 모듈 | 국회의원 | 색상 리터럴 | 차원 리터럴 | 위조 변수 | 토큰 신호 없음 | 루트/래퍼 분류 |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| 바코드 | 1 | 1 | 0 | 1 | 0 | 0 | 단일 바코드 루트 |
| 중단점 | 1 | 1 | 1 | 1 | 0 | 0 | 진단 루트 |
| 코드 스캐너 | 1 | 1 | 0 | 1 | 0 | 0 | 스캐너 호스트/프레임 루트 |
| 구성요소 | 84 | 83 | 3 | 75 | 3 | 1 | BEM 루트; 선택된 내부 그리드 및 래퍼 |
| 내용 | 10 | 9 | 0 | 6 | 0 | 1 | 루트 플러스 편집기/도구 모음 래퍼 |
| 플로트 | 8 | 8 | 0 | 8 | 0 | 0 | 팝업, 대화 상자, 토스트 및 포털 인접 래퍼 |
| 양식 | 28 | 28 | 0 | 25 | 0 | 0 | 상태 하위 항목으로 루트 제어 |
| 아이콘 | 106 | 0 | 0 | 1 | 0 | 106 | 생성된 문자 모양 루트/SVG 래퍼 |
| 레이아웃 | 7 | 2 | 0 | 7 | 1 | 4 | 레이아웃 루트; 그리드 루트의 그리드 변수 |
| 지도 | 1 | 0 | 0 | 1 | 0 | 1 | MapLibre 호스트/캔버스 루트 |
| 매트릭스 코드 | 1 | 1 | 0 | 1 | 0 | 0 | 생성된 코드 루트 |
| QR코드 | 1 | 1 | 0 | 1 | 0 | 0 | 생성된 코드 루트 |
| 자원 계획자 | 1 | 1 | 0 | 1 | 0 | 0 | 조밀한 자손이 있는 플래너 루트 |
| 스케줄러 | 1 | 1 | 0 | 1 | 0 | 0 | 조밀한 하위 항목이 있는 스케줄러 루트 |
| 선택 | 3 | 3 | 0 | 3 | 0 | 0 | 팝업 자손으로 루트 선택/제어 |
| 테마 | 3 | 2 | 0 | 0 | 0 | 1 | 토글 루트; 작곡가/공급자 래퍼 |
| 타이포그래피 | 1 | 1 | 0 | 1 | 1 | 0 | 타이포그래피 루트와 잘린 팝업 래퍼 |
| **합계** | **258** | **143** | **4** | **134** | **5** | **114** | 신호가 설계상 중복됨 |

루트 배치 규칙은 다음 분류를 따릅니다: 일반 BEM 모듈
지도를 루트에 연결합니다. `ForgeLogoCloud`, `ForgeStatsSection` 및
`ForgeTestimonialsSection`는 현재 의미 열 변수를 해당 위치에 배치합니다.
내부 그리드/목록; `ForgeGridLayout`은 루트에 행/열을 배치합니다. 그리고
`ForgeTypography`는 상속된 값을 팝업 래퍼에 배치합니다.
래퍼가 존재합니다. 부동/선택 팝업 구조는 동일한 래퍼 수준을 사용합니다.
상속 규칙이며 선언 가드는 상속 규칙이 사용하는 모든 속성을 다룹니다.
팝업 스타일.

### `@mission-platform/barcode`, `breakpoints` 및 `code-scanner`

- `forge-barcode` — `packages/integrations/barcode/src/components/molecules/forge-barcode/`
  — 소스, 모듈, 로컬 인덱스, 사양, 스토리. 생성된/바코드만 검토
  바코드 인코딩 API의 일부가 아닌 치수 또는 표면 제어.
- `forge-breakpoint-debug` — `packages/ui/breakpoints/src/components/molecules/forge-breakpoint-debug/`
  — 소스, 모듈, 로컬 인덱스, 사양, 스토리. 제외됨: 이는 진단입니다.
  재사용 가능한 시각적 테마 표면이 아닌 뷰포트/디버그 디스플레이입니다.
- `forge-code-scanner` — `packages/integrations/code-scanner/src/components/organisms/forge-code-scanner/`
  — 소스, 모듈, 로컬 인덱스, 사양, 스토리. 스캐너 프레임/컨테이너 검토
  통제만 가능; 스캐너 엔진 동작은 스타일 지정 API가 아닙니다.

### `@mission-platform/components` (84)

아래의 모든 항목에는 `<slug>.tsx`, `<slug>.module.scss`,
`<slug>.stories.tsx`, `<slug>.spec.ts` 및 `<slug>/index.ts`(패키지 포함)
`packages/ui/components/src/components/index.ts`에 배럴이 있습니다.

**기존 의미 변수 앵커:**
`forge-logo-cloud`, `forge-stats-section`, `forge-testimonials-section`.

**마이그레이션/검토:**

- 원자: `forge-avatar`, `forge-background-video`, `forge-badge`,
  `forge-button`, `forge-divider`, `forge-gauge`, `forge-icon-button`,
  `forge-icon`, `forge-kbd`, `forge-progress-bar`, `forge-quote`,
  `forge-responsive-image`, `forge-responsive-video`, `forge-separator`,
  `forge-skeleton`, `forge-spinner`, `forge-stack`, `forge-status-icon`,
  `forge-surface`, `forge-sync-status-indicator`.
- 분자: `forge-accordion`, `forge-alert`, `forge-breadcrumb`,
  `forge-button-group`, `forge-callout-block`, `forge-card`,
  `forge-carousel-indicator`, `forge-chat-bubble`, `forge-collapse`,
  `forge-device-mock`, `forge-drop-zone`, `forge-empty-state`, `forge-grid`,
  `forge-in-view`, `forge-inline-edit`, `forge-list`, `forge-masonry`,
  `forge-mention-input`, `forge-menu-item`, `forge-menu`, `forge-metric-card`,
  `forge-navbar-item`, `forge-pagination`, `forge-shortcut-hint`, `forge-tabs`,
  `forge-tag-input`, `forge-timeline`, `forge-window-popout`.
- 유기체: `forge-activity-feed`, `forge-announcement-bar`,
  `forge-asset-browser`, `forge-carousel`, `forge-chat-area`,
  `forge-command-palette`, `forge-comment-thread`, `forge-comparison-table`,
  `forge-cookie-consent`, `forge-cta-banner`, `forge-data-card`,
  `forge-diff-viewer`, `forge-drawer`, `forge-error-page`,
  `forge-kanban-board`, `forge-marketing-header`, `forge-menubar`,
  `forge-navbar`, `forge-notification-panel`, `forge-onboarding-tour`,
  `forge-pricing-table`, `forge-profile-card`, `forge-site-footer`,
  `forge-split-pane`, `forge-table`, `forge-transfer-list`, `forge-tree-view`,
  `forge-virtual-list`, `forge-virtual-log-viewer`, `forge-virtual-table`,
  `forge-virtual-tabs`, `forge-virtual-tree-view`.
- 템플릿: `forge-hero`.

세 개의 기존 앵커는 현재에 대해 의미론적 소품 전용으로 유지됩니다.
`columns` API; 이후의 패스에서는 소규모 소유의 다른 부동산을 추가할 수 있지만 반드시
열을 선택하는 두 번째 방법을 노출하지 마십시오.

### `@mission-platform/content` (10)

`forge-code-block`, `forge-mermaid`, `forge-wysiwyg-toolbar-button`,
`forge-markdown`, `forge-wysiwyg-block-controls`, `forge-wysiwyg-block-menu`,
`forge-wysiwyg-status-bar`, `forge-wysiwyg-toolbar`, `forge-monaco-editor`,
`forge-wysiwyg-editor`는 기존 원자/분자/유기체 아래에 있습니다.
디렉토리이며 모두 소스, 모듈, 스토리, 로컬 인덱스 및 패키지를 가지고 있습니다.
`packages/content/content/content/src/components/index.ts`에 배럴이 있습니다.

`forge-code-block`, `forge-mermaid`, `forge-markdown`에 대한 사양이 존재합니다.
`forge-monaco-editor`, `forge-wysiwyg-status-bar` 및
`forge-wysiwyg-editor`. 다른 4개의 WYSIWYG 컨트롤에 대한 사양은 없습니다.
`forge-monaco-editor` 및 `forge-wysiwyg-editor`은 직접에서 제외됩니다.
편집기 스타일 재정의: Monaco/editor DOM 및 편집기 상태는 내부를 소유합니다.
스타일. 주변 호스트/도구 모음은 검토 후보로 남아 있습니다.

### `@mission-platform/float`, `forms`, `layout` 및 도메인 패키지

- 부동(모두 8개, 각각 소스/모듈/사양/스토리/로컬 인덱스 포함):
  `forge-alert-banner`, `forge-dropdown`, `forge-popover`, `forge-toast`,
  `forge-tooltip`, `forge-dialog`, `forge-modal`, `forge-toast-container`.
  루트-팝업 상속 및 래퍼/포털 동작의 우선순위를 지정합니다.
- 양식(모두 28개, 각각 소스/모듈/사양/스토리/로컬 인덱스 포함):
  `forge-checkbox`, `forge-input`, `forge-radio`, `forge-range-input`,
  `forge-rating`, `forge-slider`, `forge-switch`, `forge-textarea`,
  `forge-calendar`, `forge-color-input`, `forge-date-input`,
  `forge-date-range-input`, `forge-field-set`, `forge-file-input`,
  `forge-location-input`, `forge-number-stepper`, `forge-otp-input`,
  `forge-phone-input`, `forge-radio-group`, `forge-search-input`,
  `forge-segment-control`, `forge-time-input`, `forge-time-range-input`,
  `forge-date-time-range-input`, `forge-form-builder`, `forge-form-wizard`,
  `forge-schema-form-dialog`, `forge-schema-form`.
  `size`, 유효성 검사, 확인, 비활성화 및 선택 의미 체계를 유지합니다.
- 레이아웃: `forge-container`, `forge-application-layout`, `forge-bento-layout`,
  `forge-f-pattern-layout`, `forge-vertical-layout`, `forge-z-pattern-layout`
  검토 후보입니다. `forge-grid-layout`은 기존 의미 앵커입니다.
  `rows`, `columns`, `gap`, `margin`, `padding` 및 `breakpoint`를 유지합니다.
  패키지 배럴은 `packages/ui/layout/src/components/index.ts`입니다.
- 생성/도메인 후보(각각 소스/모듈/스토리/로컬 인덱스/스펙을 가짐)
  별도의 언급이 없는 경우): `forge-matrix-code` (`packages/matrix-code`), `forge-qr-code`
  (`packages/qr-code`), `forge-resource-planner`
  (`packages/resource-planner`; 로컬 인덱스 없음, 직접 내보내기
  `src/components/index.ts`) 및 `forge-scheduler`(`packages/scheduler`).
- 선택: `forge-tag`, `forge-multiselect` 및 `forge-select`, 각각
  소스/모듈/스펙/스토리/로컬 인덱스 및 패키지 배럴. 옵션 유지
  상태 및 선택 소품 의미.
- 주제: `forge-theme-toggle`은 검토 후보입니다. `forge-theme-composer`
  및 `forge-theme-provider`는 시각적 재정의 마이그레이션에서 제외됩니다.
  테마 상태/렌더리스 제공자 인프라. 패키지 배럴은
  `packages/ui/theme/src/components/index.ts`.

### `@mission-platform/icons` (106)

106개의 아이콘 모듈은 모두 아래에 글리프 래퍼로 생성됩니다.
`packages/ui/icons/src/components/**`은 중립적인 소스, 모듈, 스토리 및
로컬 내보내기이며 생성된 파일로 내보내집니다.
`packages/ui/icons/src/components/index.ts`. 함께 배치된 사양이 없습니다. 는
생성된 전체 이름은 다음과 같습니다.

`forge-icon-alert`, `forge-icon-alert-critical`, `forge-icon-alert-info`,
`forge-icon-alert-neutral`, `forge-icon-alert-warning`, `forge-icon-align-center`,
`forge-icon-align-justify`, `forge-icon-align-left`, `forge-icon-align-right`,
`forge-icon-arrow`, `forge-icon-bell`, `forge-icon-blockquote`, `forge-icon-bold`,
`forge-icon-bullet-list`, `forge-icon-calendar`, `forge-icon-camera`,
`forge-icon-chat`, `forge-icon-check`, `forge-icon-chevron`, `forge-icon-chevrons`,
`forge-icon-clock`, `forge-icon-close`, `forge-icon-cloud`, `forge-icon-code-block`,
`forge-icon-code-inline`, `forge-icon-copy`, `forge-icon-debug`, `forge-icon-download`,
`forge-icon-draw-circle`, `forge-icon-draw-line`, `forge-icon-draw-polygon`,
`forge-icon-draw-square`, `forge-icon-draw-triangle`, `forge-icon-edit`,
`forge-icon-error`, `forge-icon-external-link`, `forge-icon-eye`, `forge-icon-eye-off`,
`forge-icon-filter`, `forge-icon-geodesic`, `forge-icon-globe`,
`forge-icon-country-globe`, `forge-icon-layer`, `forge-icon-map-marker-cluster`,
`forge-icon-flag`, `forge-icon-heading`, `forge-icon-heading-five`,
`forge-icon-heading-four`, `forge-icon-heading-one`, `forge-icon-heading-six`,
`forge-icon-heading-three`, `forge-icon-heading-two`, `forge-icon-heart`,
`forge-icon-home`, `forge-icon-image`, `forge-icon-info`, `forge-icon-italic`,
`forge-icon-join`, `forge-icon-language`, `forge-icon-lightning`, `forge-icon-link`,
`forge-icon-lock`, `forge-icon-lock-open`, `forge-icon-mail`, `forge-icon-map-pin`,
`forge-icon-menu`, `forge-icon-minus`, `forge-icon-move`, `forge-icon-notice`,
`forge-icon-numbered-list`, `forge-icon-palette`, `forge-icon-pause`,
`forge-icon-pencil`, `forge-icon-phone`, `forge-icon-play`, `forge-icon-plus`,
`forge-icon-puzzle`, `forge-icon-qr-code`, `forge-icon-refresh`, `forge-icon-redo`,
`forge-icon-route`, `forge-icon-rotate-ccw`, `forge-icon-rotate-cw`,
`forge-icon-scale-down`, `forge-icon-scale-up`, `forge-icon-search`,
`forge-icon-send`, `forge-icon-settings`, `forge-icon-share`, `forge-icon-sort`,
`forge-icon-split`, `forge-icon-star`, `forge-icon-strikethrough`,
`forge-icon-table`, `forge-icon-table-column-add`, `forge-icon-table-column-remove`,
`forge-icon-table-row-add`, `forge-icon-table-row-remove`, `forge-icon-trash`,
`forge-icon-undo`, `forge-icon-underline`, `forge-icon-upload`, `forge-icon-user`,
`forge-icon-warning`, `forge-icon-waypoint`, `forge-icon-wrench`.

이러한 스타일은 문자 모양 래퍼(`inline-flex`, 정렬,
`currentColor` 또는 SVG 크기 조정). 소비자는 이미 다음을 통해 아이콘 크기를 제어합니다.
주변 아이콘/글꼴 컨텍스트 또는 아이콘의 의미 API. 추가하지 마세요.
생성된 각 아이콘에 가방을 추가하세요.

### `@mission-platform/map` 및 `@mission-platform/typography`

`forge-map-libre`은 다음의 유일한 MapLibre 호스트 모듈입니다.
`packages/integrations/map/src/components/organisms/forge-map-libre/`; 그것은 이야기가 있고
로컬/패키지는 내보내지만 같은 위치에 있는 사양은 없습니다. 캔버스/맵 엔진은
내부 시각적 모델이므로 제외됩니다. 호스트 크기 조정 동작만 다음과 같아야 합니다.
이후 API에서 명시적으로 요구하는 경우 고려됩니다.

`forge-typography`는 유일한 타이포그래피 모듈입니다.
`packages/ui/typography/src/components/atoms/forge-typography/`. 그 근원은,
로컬 인덱스, 패키지 배럴(`packages/ui/typography/src/components/index.ts`),
스펙과 스토리가 바로 2단계 터치포인트입니다. 기존 상속
속성은 글꼴 모음, 행간, 표시 측정항목에 대한 참조입니다.
잘린 팝업 자손.

## 명시적 제외 및 의미론적 규칙

1. **이메일 구성 요소:** 258개 일치 세트에는 이메일 모듈이 없습니다. 이메일 스타일
   의도적으로 인라인이며 별도의 렌더링 모델을 따릅니다. 추가하지 마세요
   `packages/email-components`에 대한 계약입니다.
2. **생성된 아이콘:** 106개의 `@mission-platform/icons` 모듈이 모두 남아 있습니다.
   아이콘별 시각적 백이 없는 의미론적 문자 모양 구성 요소입니다.
3. **진단/인프라 호스트:** `ForgeBreakpointDebug`, `ForgeMapLibre`,
   `ForgeThemeComposer` 및 `ForgeThemeProvider`는 제외된 상태로 유지됩니다.
   위의 이유. 모나코/편집자 소유 DOM도 여전히 제외됩니다.
4. **기존 의미 차원:** `ForgeLogoCloud.columns`,
   `ForgeStatsSection.columns`, `ForgeTestimonialsSection.columns` 및
   `ForgeGridLayout.rows`/`columns`은 해당 결정의 유일한 소유자로 남아 있습니다.
   기존 사용자 정의 속성 이름은 향후 bag과 충돌해서는 안 됩니다.
   이름.
5. **의미론적 상호 작용 소품:** `size`, `variant`, 선택/선택 상태,
   유효성 검사 상태, 중단점, 행/열 및 제어 동작은
   CSS 재정의 키. 가방은 주변의 구성 요소 소유 시각적 가치를 조정할 수 있습니다.
   선택한 의미 상태는 변경되지만 해당 상태를 대체할 수는 없습니다.

## 2단계 구현 체크리스트

- 분류된 행에만 형식화된 `properties` 인터페이스를 추가합니다.
  선언이 구성요소 소유인지 확인한 후 **마이그레이션/검토**하세요.
- `CSSStyleProperties`과 교차하는 각 중립 재정의 스타일을 입력합니다.
  구성 요소의 명시적인 사용자 정의 속성 키(`string | undefined`) 하다
  이것을 `Record<string, string>` 또는 글로벌 CSS 사전으로 바꾸지 마십시오.
- 노출된 키당 하나의 `--forge-<slug>-<key>` 대체를 토큰 대체와 함께 추가합니다.
  하위 항목에는 `inherits: true`가 필요합니다.
- `style`을 통해 정의된 값만 구성 요소 루트/래퍼에 연결합니다.
  `styles`도 없고 알 수 없는 가방 속성도 없습니다.
- 새로운 공개 시 정확한 로컬 인덱스 및 패키지 구성 요소 배럴을 업데이트합니다.
  유형이 도입되었습니다. 기존 수출 주문/협약을 유지합니다.
- 영향을 받는 각 사양에 기본/1회 재정의/중첩 상태 적용 범위를 추가하고
  기존의 같은 위치에 있는 스토리에 대한 예제를 재정의합니다. 앵커 사양을 사용하세요.
  의미론적 변수를 보호하기 위한 로고/통계/평가/그리드.
- Vue 이미터 작업을 별도로 유지하십시오. 기본 템플릿 범위 스타일은 다음을 사용할 수 있습니다.
  Vue `v-bind()`, 중립 소스 및 기타 대상 스타일은 그대로 유지되어야 합니다.
  프레임워크 중립적입니다.
