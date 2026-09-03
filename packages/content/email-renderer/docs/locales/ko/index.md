# @mission-platform/email-renderer

정식 영어 원문을 기계 지원으로 번역한 문서입니다. 필요 시 사람이 검수하세요. 패키지 이름, 명령, 경로, 기술 식별자는 그대로 둡니다.

> packages/email-renderer/docs/index.md: [packages/email-renderer/docs/index.md](../../index.md)
> 언어: 한국어 (ko)

`@mission-platform/email-renderer`은 미션 플랫폼 이메일 트리에 대한 프레임워크 중립 렌더링 경계를 소유합니다. 루트 항목은 서버 측 이메일 생성에 안전합니다. 브라우저 어댑터는 명시적인 하위 경로 뒤에 격리됩니다.

## 서버 렌더링 및 마크다운

```ts
import { renderEmail, renderMarkdown } from '@mission-platform/email-renderer';

const document = renderMarkdown('# Welcome\n\nRead **more** at [Mission Platform](https://example.com).');
const html = renderEmail(document.node, { title: 'Welcome', previewText: 'A short preview' });
```

Markdown은 공유 Forge 트리로 변환되므로 직렬화 전에 링크, 이미지, 텍스트 및 HTML이 이스케이프되거나 검증됩니다. 출력에는 결정적인 속성/스타일 순서가 있으며 스크립트 URL, 이벤트 속성, CSS 변수, flex/grid 값 및 프레임워크 마커를 거부합니다.

## 브라우저 어댑터

브라우저 미리보기 또는 애플리케이션에 필요한 어댑터 하위 경로만 사용하십시오.

- `@mission-platform/email-renderer/vue` → `renderToEmailVue`, `toEmailVueComponent`.
- `@mission-platform/email-renderer/react` → `renderToEmailReact`, `toEmailReactComponent`.
- `@mission-platform/email-renderer/svelte` → `renderToEmailSvelte` for Svelte 5 `{@render ...}`.
- `@mission-platform/email-renderer/solid` → `renderToEmailSolid`, `toEmailSolidComponent`.
- `@mission-platform/email-renderer/web-components` → `renderToEmailWebComponent`.

5개의 브라우저 어댑터를 모두 노출하는 단일 선택적 가져오기의 경우 다음을 사용합니다.
`@mission-platform/email-renderer/adapters`. 이 항목은
루트 항목이므로 서버 전용 이메일 생성 시 프레임워크 런타임이 로드되지 않습니다.

이러한 선택적 진입점은 동일한 Forge 트리를 재사용합니다. 루트 이메일 직렬 변환기에서는 가져오지 않으며 서버 전용 이메일 배포에는 필요하지 않습니다.
