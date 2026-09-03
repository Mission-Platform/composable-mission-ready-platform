# @mission-platform/email-components

정식 영어 원문을 기계 지원으로 번역한 문서입니다. 필요 시 사람이 검수하세요. 패키지 이름, 명령, 경로, 기술 식별자는 그대로 둡니다.

> packages/email-components/docs/index.md: [packages/email-components/docs/index.md](../../index.md)
> 언어: 한국어 (ko)

`@mission-platform/email-components`에는 이메일 안전 트리를 생성하기 위한 형식화된 프레임워크 중립적인 Forge JSX 구성 요소가 포함되어 있습니다. `@mission-platform/email-renderer`을 사용하여 서버에서 해당 트리를 직렬화합니다. 이메일 경로에는 Vue, React, Svelte, Solid, 웹 구성 요소 런타임, 브라우저 DOM 또는 JavaScript가 필요하지 않습니다.

## 용법

```ts
import { EmailButton, EmailContainer, EmailDocument, EmailTypography } from '@mission-platform/email-components';
import { renderEmail } from '@mission-platform/email-renderer';

const email = EmailDocument({
  previewText: 'A short inbox preview',
  children: EmailContainer({
    children: EmailTypography({ children: 'Hello from Mission Platform.' }),
  }),
});

const html = renderEmail(email, { title: 'Welcome', responsive: true });
```

## 브라우저 미리보기

구성 요소는 다음에서 사용하는 것과 동일한 프레임워크 중립적인 Forge 트리를 반환합니다.
표준 브라우저 파이프라인. 미리보기를 위해 해당 트리를 선택사항으로 전달하세요.
호스트 프레임워크에 필요한 어댑터 진입점:

```ts
import { renderToEmailVue } from '@mission-platform/email-renderer/vue';

const previewNode = renderToEmailVue(email);
```

React, Svelte, Solid 및 웹 구성 요소는 해당 렌더러를 사용합니다.
또는 5개 모두에서 가져올 수 있습니다.
`@mission-platform/email-renderer/adapters`. 브라우저 미리보기 경로 및
`renderEmail` 서버 경로는 동일한 구성 요소 트리를 사용합니다. 후자뿐이다
완전한 이메일 문서 래퍼를 추가합니다.

## 구성요소

- 원자: `EmailTypography`, `EmailButton`, `EmailImage`, `EmailDivider`, `EmailSpacer`.
- 분자: `EmailRow`, `EmailColumn`, `EmailCard`, `EmailList`, `EmailSocialLinks`.
- 유기체: `EmailPreheader`, `EmailHeader`, `EmailFooter`.
- 템플릿: `EmailDocument`, `EmailContainer`, `EmailSection`.

`EmailTypography`은 웹 `ForgeTypography` 어휘를 미러링하는 단일 텍스트 원자입니다. `as`는 렌더링된 요소(기본적으로 `p`, `href`가 설정된 경우 `a`)를 선택하고, `variant`은 유형 스케일(`as`이 설정된 경우 일치하는 제목 스케일)을 선택합니다. `h1`–`h6`, 그렇지 않으면 `body-md`) 및 `color`, `align`, `target` 및 `underline`는 인라인 선언을 조정합니다.

```ts
EmailTypography({ as: 'h1', children: 'Welcome' });
EmailTypography({ children: 'Body copy' });
EmailTypography({ href: 'https://example.com', target: '_blank', children: 'Read more' });
```

모든 레이아웃은 `table`, `tbody`, `tr` 및 `td`을 기반으로 합니다. 버튼은 테이블 내의 일반 링크이고, 이미지에는 비어 있지 않은 `alt` 텍스트가 필요하고, URL은 검증되고, 스타일은 `@mission-platform/tokens`의 리터럴 선언으로 확인됩니다.

## 호환성 정책

기준선은 다음을 따릅니다. [기능 카탈로그를 이메일로 보낼 수 있나요?](https://www.caniemail.com/features), `2026-08-08`에서 검토됨. 구현은 다음에 의존합니다. [HTML 테이블](https://www.caniemail.com/features/html-tables), [인라인 스타일](https://www.caniemail.com/features/css-inline-styles), [최대 너비](https://www.caniemail.com/features/css-max-width) 및 선택 사항 [미디어 쿼리](https://www.caniemail.com/features/css-at-media). 정적 출력은 Flexbox, 그리드, CSS 사용자 정의 속성, 논리 속성, 스크립트, 이벤트 핸들러 또는 프레임워크 하이드레이션 마커에 의존하지 않습니다.

반응형 CSS는 점진적인 개선일 뿐입니다. `<style>` 블록이 제거되거나 무시될 때 인라인 테이블 레이아웃을 계속 사용할 수 있습니다. 사용자 정의 노드를 추가할 때 애플리케이션 테스트에서 `assertCompatibleEmailHtml`을 사용하십시오.
