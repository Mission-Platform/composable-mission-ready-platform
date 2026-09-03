# @mission-platform/icons

정식 영어 원문을 기계 지원으로 번역한 문서입니다. 필요 시 사람이 검수하세요. 패키지 이름, 명령, 경로, 기술 식별자는 그대로 둡니다.

> packages/ui/icons/docs/index.md: [packages/ui/icons/docs/index.md](../../index.md)
> 언어: 한국어 (ko)

`@mission-platform/icons`은 미션 플랫폼을 위한 프레임워크 중립적인 SVG 아이콘 구성 요소 모음입니다. 각 아이콘은
한 번 작성되어 빌드 시 네이티브 Vue 3, React, Solid, Svelte 및 웹 구성 요소 빌드로 컴파일됩니다.

## 아키텍처 및 유통

이 패키지는 `@mission-platform/vite-plugin-forge`을 활용하여 모든 사용자에게 고성능, 트리 흔들기 가능한 아이콘을 제공합니다.
지원되는 프레임워크:

- **컴파일**: 단일 `pnpm build`은 대상당 하나의 프레임워크 네이티브 번들인 결정적 `dist/icons.svg`을 생성합니다.
  스프라이트 및 아이콘별 CSS 자산.
- **단일 입력, 조건부 해결**: 공개 진입점이 정확히 1개 있습니다.
  `@mission-platform/icons`. `mp:vue`, `mp:react`, `mp:solid`를 전달하며,
  `mp:web-component` 수출 조건; 툴체인이 활성화되는 것이 무엇이든 컴파일된 빌드가 무엇인지 결정합니다.
  지정자는 다음으로 결정됩니다. 설정된 조건이 없으면 중립 단조 소스로 돌아갑니다.
  "한 번 쓰기" 구성 요소가 소비됩니다.

## 용법

### 프레임워크 선택

가져올 때마다가 아니라 **한 번** 프레임워크를 선택합니다. Vite에서 `resolve.conditions`(사용
`defineFrameworkAppConfig` 또는 `@mission-platform/vite-config`의 `frameworkResolveConditions`) 및 TypeScript
`customConditions`를 통해(`@mission-platform/typescript-config/framework-<name>` 확장
사전 설정):

```ts
resolve: {
  conditions: frameworkResolveConditions('mp:vue'),
}
```

### 수입품

그러면 모든 가져오기는 프레임워크 전체에서 단순하고 동일합니다.

**Vue 3**(`mp:vue` 활성):

```vue
import { ForgeIconAlert, ForgeIconArrow } from '@mission-platform/icons';
```

**React**(`mp:react` 활성):

```tsx
import { ForgeIconAlert, ForgeIconArrow } from '@mission-platform/icons';
```

### 중립 부품 수입

프레임워크 중립 구성 요소(`vite-plugin-forge`으로 컴파일)를 작성할 때 `mp:*` 조건이 활성화되지 않으며
동일한 지정자가 중립 소스를 제공합니다.

```tsx
import { ForgeIconAlert, ForgeIconArrow } from '@mission-platform/icons';
```

## 분류 및 카탈로그

저작 폴더와 스토리북 제목은 `icons/<category>/<subcategory>/<icon-name>`을 따릅니다. 검토된 카탈로그 표지
`navigation`, `text`, `maps`, `routing`, `drawing`, `content`, `status`, `communication`, `media`, `security`, `data`,
`time` 및 `objects`. 격차 검토는 `src/catalog.ts`에 기록됩니다. 국가 지원을 데이터 중심으로 유지하고 기록합니다.
국가별로 하나의 구성 요소를 만드는 대신 애플리케이션별 아트워크를 연기했습니다.

## 스프라이트 재사용

모든 래퍼는 `<use href="#icon-id">` 참조를 사용하여 액세스 가능한 외부 `<svg>`을 렌더링합니다. `IconSpriteProvider` 마운트
인라인 하위 트리에 대해 표준 기호를 한 번:

```tsx
import { ForgeIconAlert, ForgeIconArrow, IconSpriteProvider } from '@mission-platform/icons';

export function Toolbar() {
  return (
    <IconSpriteProvider>
      <ForgeIconAlert ariaLabel="Alert" />
      <ForgeIconArrow
        direction="right"
        ariaLabel="Next"
      />
    </IconSpriteProvider>
  );
}
```

캐시 가능한 외부 자산의 경우 `inline={false}`과 함께 `src="/assets/icons.svg"`을 사용합니다. 외부 SVG 조각 참조
동일한 출처 액세스 또는 호환 가능한 CORS 정책이 필요합니다. 인라인 모드는 SSR, 제한적인 CSP 또는 브라우저에 대한 대체입니다.
외부 조각을 확인할 수 없습니다. 패키지 빌드는 `dist/icons.svg`를 내보냅니다.
`@mission-platform/icons/icons.svg`.

## 국가 및 구성 API

`ForgeIconFlag` 및 `ForgeIconCountryGlobe`은 다음을 포함하여 `SUPPORTED_COUNTRY_CODES`의 대문자 ISO 스타일 코드를 허용합니다.
`US`, `CA`, `JP`, `GB` 및 `ZA`. 지원되지 않는 런타임 값은 설명 오류를 발생시킵니다. 국가 지구본, 경로/경유지
패턴 및 향후 오버레이는 유형화된 기호 구성입니다. 변환을 통해 기존 ID를 참조하고 확인됩니다.
스프라이트 생성 전에 참조 및 주기가 누락된 경우.

## API 참조

각 아이콘은 `.forge-icon-<name>` BEM 클래스를 사용하는 중앙 `<div>` 래퍼 내에서 `<svg role="img">`을 렌더링합니다.
모든 아이콘은 $24 \times 24$ 뷰박스를 기반으로 합니다.

### 유니버설 소품

| 소품        | 유형               | 기본값            | 설명                                                                                                            |
| :---------- | :----------------- | :---------------- | :-------------------------------------------------------------------------------------------------------------- |
| `size`      | `number \| string` | `'md'`            | 너비와 높이. 명명된 토큰(`'2xs'`, `'xs'`, `'sm'`, `'md'`, `'lg'`, `'xl'`, `'2xl'`) 또는 픽셀 번호를 지원합니다. |
| `color`     | `string`           | `'currentColor'`  | 획 색상(채워진 마커 아이콘 채우기)                                                                              |
| `ariaLabel` | `string`           | _아이콘별 기본값_ | 접근 가능한 이름. 생략하면 아이콘은 `aria-hidden`로 표시됩니다.                                                 |

### 행동 아이콘

특정 아이콘에는 모양을 제어하기 위한 추가 소품이 포함되어 있습니다.

| 아이콘             | 추가 소품                                                           | 설명                                                     |
| :----------------- | :------------------------------------------------------------------ | :------------------------------------------------------- |
| `ForgeIconArrow`   | `direction`: `'up' \| 'right' \| 'down' \| 'left'`(기본값 `'up'`)   | 인라인 변환을 통해 화살표를 회전합니다.                  |
| `ForgeIconChevron` | `direction`: `'up' \| 'right' \| 'down' \| 'left'`(기본값 `'down'`) | 인라인 변환을 통해 갈매기 모양을 회전합니다.             |
| `ForgeIconSort`    | `active`: `boolean`, `direction`: `'asc' \| 'desc' \| undefined`    | 활성 정렬 방향과 일치하는 갈매기 모양을 강조 표시합니다. |

## 아이콘 라이브러리

라이브러리에는 여러 범주를 포괄하는 다양한 아이콘이 포함되어 있습니다.

- **상태 및 상태**: `ForgeIconAlert`, `ForgeIconCheck`, `ForgeIconError`, `ForgeIconInfo`, `ForgeIconWarning`.
- **탐색**: `ForgeIconArrow`, `ForgeIconChevron`, `ForgeIconHome`, `ForgeIconMenu`, `ForgeIconExternalLink`.
- **미디어**: `ForgeIconCamera`, `ForgeIconImage`, `ForgeIconMail`, `ForgeIconPhone`.
- **UI 컨트롤**: `ForgeIconClose`, `ForgeIconEdit`, `ForgeIconPlus`, `ForgeIconMinus`, `ForgeIconSearch`,
  `ForgeIconSettings`.
- **컨텐츠 형식**: `ForgeIconBold`, `ForgeIconItalic`, `ForgeIconBulletList`, `ForgeIconNumberedList`,
  `ForgeIconHeadingOne`...
  `ForgeIconHeadingSix`.
- **전문 도구**: `ForgeIconWrench`, `ForgeIconPalette`, `ForgeIconDebug`, `ForgeIconQrCode`.

## 개발 및 유지 관리

### 건물 아이콘

패키지 소유 빌드는 중립 선언, 모든 프레임워크 어댑터 및 SVG 스프라이트를 내보냅니다. 카탈로그를 변경한 후 또는
스프라이트 소스, 실행:

```sh
pnpm exec turbo run build:check --filter @mission-platform/icons
pnpm exec turbo run build --filter @mission-platform/icons
```

### 스토리북

아이콘은 `icons/<category>/<subcategory>/<icon-name>` 아래에 카탈로그화되어 있고 `icons/overview`은 전체 갤러리로 남아 있습니다.
개요에서는 하나의 `IconSpriteProvider`를 통해 반복되는 아이콘도 보여줍니다. 개별 이야기에서는 `size`이 노출됩니다.
해당하는 경우 `color`, 국가 코드 및 `ariaLabel`를 제어합니다.
