# @mission-platform/i18n

정식 영어 원문을 기계 지원으로 번역한 문서입니다. 필요 시 사람이 검수하세요. 패키지 이름, 명령, 경로, 기술 식별자는 그대로 둡니다.

> packages/i18n/docs/index.md: [packages/i18n/docs/index.md](../../index.md)
> 언어: 한국어 (ko)

`@mission-platform/i18n`은 프레임워크에 구애받지 않는 국제화(i18n) 래퍼입니다.
에 [i18next](https://www.i18next.com/). 미션 플랫폼 전반에 걸쳐 번역을 처리하는 통합된 방법을 제공합니다.
Vue 3 및 React용 전용 어댑터 포함.

## 진입점

패키지에는 단일 진입점 `@mission-platform/i18n`이 있습니다. 어떤 어댑터로 해결되는지는 다음에 의해 결정됩니다.
전체 프로젝트에 대해 **한 번** 선택하는 활성 `mp:<framework>` 내보내기 조건:
Vite의 `resolve.conditions`(`defineFrameworkAppConfig`/`frameworkResolveConditions` 참조)
`@mission-platform/vite-config`) 및 TypeScript의 `customConditions`(
`@mission-platform/typescript-config/framework-<name>` 사전 설정). 모든 가져오기는 그대로 유지됩니다.

| 활성 상태 | | 주요 수출 |
| :--------------- | :--------------------- | :---------------------------------------------------------------------- |
| _(없음)_ | 프레임워크 중립 코어 | `createForgeI18N`, `forgeNamespace`, `localeNamespaces`, `mergeLocales` |
| `mp:vue` | Vue 3 어댑터 | 중립 코어 플러스 `createForgeI18NVue`, `useI18n` |
| `mp:react` | React 어댑터 | 중성 코어 플러스 `ForgeI18NProvider`, `useI18n` |

## 핵심 개념

### i18n 인스턴스

코어는 동기적으로 초기화된 i18next 인스턴스를 반환하는 `createForgeI18N(options)`을 제공합니다.

- **보간**: 단일 중괄호 구분 기호를 사용합니다(예: `{name}`).
- **HTML 이스케이프**: 프레임워크가 다음에 따라 이스케이프를 처리할 수 있도록 기본적으로 비활성화되어 있습니다(`escapeValue: false`).
  자체 보안 모델.

### 네임스페이스 전략

모노레포에서 충돌을 피하기 위해 번역은 `mp.<workspace>` 규칙을 사용하여 네임스페이스로 그룹화됩니다.

- **패키지**: `forgeNamespace('<package_name>')`을 사용합니다(예: `@mission-platform/breakpoints`은 `mp.breakpoints`를 사용합니다).
- **앱**: `forgeNamespace('<app_name>')`을 사용하세요.

#### 네임스페이스 계층 구조 및 재정의

1. **기본 네임스페이스**: 앱은 자체 네임스페이스를 기본값으로 정의합니다.
2. **폴백**: 기본 네임스페이스는 다른 네임스페이스로 폴백되므로 구성 요소 코드가 자체 키를 확인할 수 있습니다.
3. **재정의**: 앱은 구성에 `overrides` 개체를 제공하여 패키지의 특정 문자열에 레이블을 다시 지정할 수 있습니다.
   다른 사람에게 영향을 주지 않고.

## 사용 예

### 1. 핵심 구성

```ts
import { createForgeI18N, localeNamespaces, forgeNamespace } from '@mission-platform/i18n';

const i18n = createForgeI18N({
  namespace: forgeNamespace('my-care-notes'),
  namespaces: localeNamespaces('en', enBundles), // Turn YAML bundles into i18next shape
  overrides: {
    [forgeNamespace('breakpoints')]: {
      en: { breakpoint: 'Viewport:' },
    },
  },
});
```

### 2. Vue 3 통합

**설치:**

```ts
// With the mp:vue condition active.
import { createForgeI18N, createForgeI18NVue } from '@mission-platform/i18n';

const i18n = createForgeI18N({ messages: { en: { hello: 'Hello {name}' } } });
app.use(createForgeI18NVue(i18n));
```

**구성요소 사용법:**

```vue
<script setup lang="ts">
  import { useI18n } from '@mission-platform/i18n';
  const { t, locale, setLocale } = useI18n();
</script>

<template>
  <button>{{ t('hello', { name: 'World' }) }}</button>
</template>
```

### 3. React 통합

**공급업체 설정:**

```tsx
// With the mp:react condition active — same bare specifier as the Vue example.
import { createForgeI18N, ForgeI18NProvider, useI18n } from '@mission-platform/i18n';

const i18n = createForgeI18N({ messages: { en: { hello: 'Hello {name}' } } });

root.render(
  <ForgeI18NProvider i18n={i18n}>
    <App />
  </ForgeI18NProvider>,
);
```

**구성요소 사용법:**

```tsx
function Greeting() {
  const { t } = useI18n();
  return <button>{t('hello', { name: 'World' })}</button>;
}
```

## API 참조

### `forgeNamespace(workspace: string)`

지정된 작업공간에 대한 표준화된 네임스페이스 문자열을 반환합니다(예: `'breakpoints'` $\rightarrow$
`'mp.breakpoints'`).

### `localeNamespaces(locale: string, bundles: any)`

원시 네임스페이스 키 번역 파일(일반적으로 YAML)을 i18next에서 예상하는 형식으로 변환합니다.
