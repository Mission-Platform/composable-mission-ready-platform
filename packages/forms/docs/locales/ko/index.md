# @mission-platform/forms

정식 영어 원문을 기계 지원으로 번역한 문서입니다. 필요 시 사람이 검수하세요. 패키지 이름, 명령, 경로, 기술 식별자는 그대로 둡니다.

> packages/forms/docs/index.md: [packages/forms/docs/index.md](../../index.md)
> 언어: 한국어 (ko)

`@mission-platform/forms`은 Mission Platform이 렌더링할 수 있도록 하는 높은 수준의 양식 오케스트레이션 구성 요소를 제공합니다.
복잡한 양식과 마법사는 전적으로 JSON 스키마 정의에서 생성됩니다.

다른 공유 패키지와 마찬가지로 "한 번 작성" 접근 방식을 따르며 중립 JSX에서 구성 요소를 작성하고 컴파일합니다.
기본 Vue 3 및 React 구성 요소로 변환됩니다.

모든 가져오기는 기본 `@mission-platform/forms` 지정자를 사용합니다. 프레임워크는 전체 앱에 대해 한 번 선택됩니다.
`mp:<framework>` 내보내기 조건 - `resolve.conditions`(`defineFrameworkAppConfig` / 참조)
`@mission-platform/vite-config`의 `frameworkResolveConditions`) 및 `customConditions`(
`@mission-platform/typescript-config/framework-<name>` 사전 설정).

## 핵심 구성 요소

### `ForgeSchemaForm`

데이터 기반 양식을 렌더링하기 위한 기본 구성 요소입니다. JSON 스키마 정의를 사용하여 자동으로 생성합니다.
해당 UI 위젯 및 유효성 검사 로직.

#### 주요 특징:

- **스키마 기반**: JSON 스키마를 통해 완전히 구성됩니다. 단일 개체는 한 단계 형식을 렌더링합니다. 객체의 배열
  다단계 마법사를 만듭니다.
- **일관된 검증**: `@mission-platform/forms-core`(Ajv)을 사용하여 Vue 및 React 앱이
  동일한 데이터가 동일합니다.
- **조건부 가시성**: `ui.visibleWhen`을 지원하여 다른 입력 값에 따라 필드를 동적으로 표시하거나 숨깁니다.
- **중첩 구조**: 복잡한 데이터 모델의 중첩 필드 세트를 처리합니다.

#### 용법:

**Vue**(`mp:vue` 활성):

```vue
<script setup lang="ts">
  import { SchemaForm } from '@mission-platform/forms';
  const mySchema = {/* JSON Schema */};
</script>

<template>
  <SchemaForm
    :schema="mySchema"
    @change="onValuesChange"
  />
</template>
```

**React**(`mp:react` 활성 — 동일한 지정자에 유의):

```tsx
import { SchemaForm } from '@mission-platform/forms';

const MyComponent = () => (
  <SchemaForm
    schema={mySchema}
    onChange={(values) => console.log(values)}
  />
);
```

---

### `ForgeFormBuilder`

개발자가 아닌 사람이 JSON을 수동으로 작성하지 않고도 양식 스키마를 생성할 수 있게 해주는 시각적 저작 도구입니다.

#### 주요 특징:

- **비주얼 캔버스**: 필드를 정렬하고 해당 속성을 정의하기 위한 드래그 앤 드롭 스타일 편집기입니다.
- **마법사 구성**: 마법사의 다단계 흐름을 관리하기 위한 전용 "단계" 탭입니다.
- **실시간 미리보기**: 양식이 작성되는 동안 실시간으로 렌더링됩니다.
- **스키마 내보내기**: 데이터베이스에 저장하거나 직접 사용할 수 있는 `SchemaFormDefinition`을 내보냅니다.
  `ForgeSchemaForm`.

#### 공들여 나열한 것:

빌더는 `ForgeVerticalLayout`을 사용하여 3열 레이아웃으로 구성됩니다.

1. **필드 팔레트**: 양식에 추가할 수 있는 위젯(입력, 선택, 날짜 등) 목록입니다.
2. **편집기 캔버스**: 필드가 구성되고 구성되는 중앙 영역입니다.
3. **Inspector**: 현재 선택한 필드에 대한 자세한 속성 편집기입니다.

## 아키텍처 및 종속성

프레임워크 패리티를 유지하면서 종속성 주기를 방지하려면 다음을 수행하세요.

- `@mission-platform/forms`은 `@mission-platform/components`에 종속됩니다(`ForgeInput`와 같은 개별 입력 위젯의 경우,
  `ForgeCheckbox`) 및 `@mission-platform/layouts`.
- 유효성 검사, 스키마 구문 분석, 조건부 논리 등 모든 무거운 작업을 프레임워크에 구애받지 않는 작업에 위임합니다.
  `@mission-platform/forms-core`.

## 스타일

패키지는 다음을 통해 공유 접근성 도우미를 제공합니다.

```ts
import '@mission-platform/forms/styles';
```

또한 각 구성 요소는 특정 스타일을 위해 함께 배치된 자체 CSS 모듈을 활용합니다.
