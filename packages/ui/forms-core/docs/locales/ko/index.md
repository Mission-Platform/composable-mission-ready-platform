# @mission-platform/forms-core

정식 영어 원문을 기계 지원으로 번역한 문서입니다. 필요 시 사람이 검수하세요. 패키지 이름, 명령, 경로, 기술 식별자는 그대로 둡니다.

> packages/ui/forms-core/docs/index.md: [packages/ui/forms-core/docs/index.md](../../index.md)
> 언어: 한국어 (ko)

`@mission-platform/forms-core`은 비즈니스 로직, 유형 정의 및
Mission Platform 전반의 양식에 대한 검증 엔진. 이 논리를 순수 TypeScript 패키지에 중앙 집중화함으로써 두 가지 모두
Vue 및 React 구현은 구성을 통해 완벽한 패리티를 유지합니다.

## 개요

패키지는 세 가지 주요 영역에 중점을 둡니다.

1. **JSON 스키마 정의**: 양식 스키마를 정의하기 위한 유형 및 구조입니다.
2. **조건부 가시성**: 다른 양식 값을 기반으로 필드를 렌더링해야 하는지 결정하는 논리입니다.
3. **검증 및 기본값**: JSON 스키마 검증 및 기본값 자동 생성을 위해 Ajv와 통합
   가치.

## 주요 모듈

### 1. 양식 정의 및 유형(`src/types.ts`)

양식에 대한 구조적 계약을 정의합니다.

- `SchemaFormDefinition`: 루트 정의입니다. 단일 객체는 1단계 형식을 나타내고, 객체 배열은
  다단계 마법사를 정의합니다.
- `FormFieldSchema`: 렌더링 준비가 된 필드의 확인된 모양입니다.
- `FieldUiOptions`: 프레젠테이션 힌트를 제공하기 위한 JSON 스키마 확장(`ui` 네임스페이스).
- `FormValues` & `FormErrors`: 현재 양식 데이터 및 해당 유효성 검사 오류에 대한 유형 맵입니다.

### 2. 조건부 가시성(`src/conditions.ts`)

현재 값을 기반으로 필드가 표시되어야 하는지 평가하는 엔진을 제공합니다.

- `evaluateCondition(condition, values)`: JSON 스키마와 유사한 조합자를 사용하여 `FieldCondition`을 평가합니다.
  - `allOf`: AND 논리(모든 조건이 true여야 함).
  - `anyOf`: OR 논리(적어도 하나의 조건이 true여야 함).
  - `oneOf`: XOR 논리(정확히 하나의 조건이 참이어야 함).
- `isFieldVisible(field, values)`: 특정 필드의 `visibleWhen` 속성이 만족되는지 확인하는 도우미입니다.

### 3. JSON 스키마 통합(`src/json-schema.ts`)

원시 JSON 스키마와 렌더링 가능한 양식 필드 간의 변환을 처리합니다.

- `jsonSchemaToFields(schema)`: JSON 스키마를 `FormFieldSchema`의 순서가 지정된 목록으로 재귀적으로 변환합니다.
- `jsonSchemaDefaults(schema)`: 스키마의 `default` 키워드 또는 유형에 적합한 초기 값을 생성합니다.
  공백.
- `createFormValidator(schema, translate?)`: Ajv를 사용하여 양식 값의 유효성을 검사하는 `FormValidator`를 반환합니다. 그것
  유효성 검사에서 숨겨진 필드를 자동으로 제외하고 사용자 정의 오류 메시지를 지원합니다.

### 4. 폼 빌더 로직(`src/builder-types.ts`, `src/form-schema.ts`)

시각적 Form Builder 도구를 지원합니다.

- **변환**: `fieldsToSchema` 및 `schemaToFields`과 같은 기능을 사용하면 빌더가 작업 간에 이동할 수 있습니다.
  표현(필드 트리) 및 최종 `SchemaFormDefinition`.
- **필드 팔레트**: 빌더 팔레트에서 사용 가능한 위젯을 정의하는 `DEFAULT_FIELD_TYPES`을 제공합니다.

## 종속성 모델

이 패키지는 의도적으로 간결하고 프레임워크에 구애받지 않습니다.

- **프레임워크 없음**: Vue 또는 React에 종속되지 않습니다.
- **주요 종속성**:
  - `ajv` & `ajv-formats`: 고성능 JSON 스키마 검증용입니다.
  - `nanoid`: 빌더에서 고유 필드 식별자를 생성하는 데 사용됩니다.

## 소비자

기본 소비자는 `@mission-platform/forms`이며, 이 코어를 사용하여 다음을 구동합니다.

- **ForgeSchemaForm**: 이러한 유틸리티를 사용하여 필드를 렌더링하고 데이터의 유효성을 검사합니다.
- **ForgeFormBuilder**: 변환 논리를 사용하여 사용자가 스키마를 시각적으로 작성할 수 있도록 합니다.
