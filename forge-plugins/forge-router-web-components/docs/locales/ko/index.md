# @mission-platform/forge-router-web-components

정식 영어 원문을 기계 지원으로 번역한 문서입니다. 필요 시 사람이 검수하세요. 패키지 이름, 명령, 경로, 기술 식별자는 그대로 둡니다.

> forge-plugins/forge-router-web-components/docs/index.md: [forge-plugins/forge-router-web-components/docs/index.md](../../index.md)
> 언어: 한국어 (ko)

프레임워크가 없는 웹 구성 요소를 위한 Forge 라우터 대상입니다.

## 비동기 경로 로딩

비동기 경로 보기가 확인되는 동안 스피너를 표시하려면 `loadingFallback`을 사용하세요.
`forge-router-outlet`은 폴백을 오버레이로 렌더링하고 현재 상태를 유지합니다.
대상이 준비될 때까지 뷰가 마운트됩니다.

```ts
import {
  MpMemoryHistory,
  createWebComponentsRouter,
  registerRouterElements,
  setForgeRouter,
} from '@mission-platform/forge-router-web-components/runtime';

registerRouterElements();

const router = createWebComponentsRouter({
  history: new MpMemoryHistory('/docs/intro'),
  loadingFallback: () => {
    const spinner = document.createElement('span');
    spinner.className = 'docs-loading-spinner';
    spinner.setAttribute('aria-label', 'Loading documentation');
    return spinner;
  },
  routes: [
    {
      path: '/docs/*',
      name: 'doc',
      component: async () => (await import('./views/docs-view')).default(),
    },
  ],
});

setForgeRouter(router);
document.querySelector('forge-router-outlet')?.setRouter(router);
```

```html
<forge-router-link to="/docs/advanced">Advanced documentation</forge-router-link>
<forge-router-outlet></forge-router-outlet>
```

아웃렛은 성공, 리디렉션, 취소 또는 취소 후에 오버레이를 제거합니다.
실패. 경로 보기 약속은 내비게이션과 콘센트 장착 간에 공유됩니다.
따라서 게으른 팩토리는 두 번 호출되지 않습니다. 쓸모없는 결과로 인한 늦은 결과
탐색은 최신 보기를 대체할 수 없습니다.

`forge-router-link`은 범위가 지정된 SPA 진입점입니다. 이를 통해 기록을 업데이트합니다.
기본적으로 `push` 또는 `replace` 속성/속성이 설정된 경우 `replace`,
`active` 및 `exact-active` 상태를 업데이트하고 수정된 클릭을 유지합니다.
기본이 아닌 클릭, 다운로드, 외부 URL, 네이티브에 대한 타겟 링크
브라우저.

## 프레임워크 중립적 `Suspense`

공유 Forge 소스는 중립 경계를 사용하고 각 컴파일러가 이를 낮추도록 할 수 있습니다.
타겟 네이티브 구현에:

```tsx
<Suspense fallback={<LoadingSpinner label="Loading documentation" />}>
  <DocumentationRoute />
</Suspense>
```

웹 구성 요소의 경우 라우터 콘센트의 `loadingFallback` 계약을 사용합니다.
경로 전환; 프레임워크 런타임이나 글로벌 앵커 차단이 없습니다.
필수.
