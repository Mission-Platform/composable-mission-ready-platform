# @mission-platform/router

정식 영어 원문을 기계 지원으로 번역한 문서입니다. 필요 시 사람이 검수하세요. 패키지 이름, 명령, 경로, 기술 식별자는 그대로 둡니다.

> packages/router/docs/index.md: [packages/router/docs/index.md](../../index.md)
> 언어: 한국어 (ko)

Vue, React 및 React에 대한 통합 경로 모델과 프레임워크별 어댑터를 제공하는 프레임워크 독립적 라우팅 라이브러리입니다.
다른 프레임워크.

## 개요

`@mission-platform/router` 패키지는 경로를 분리하는 **프레임워크 중립 라우팅 시스템**을 구현합니다.
프레임워크별 구현 세부 사항의 논리를 정의하고 일치시킵니다. 이를 통해 경로를 한 번 정의할 수 있습니다.
일관성을 유지하면서 다양한 프레임워크에서 사용할 수 있습니다.

## 주요 특징

- **프레임워크에 구애받지 않는 핵심**: 프레임워크 전체에서 작동하는 중립 형식으로 경로를 정의합니다.
- **유형 안전 API**: 경로 정의 및 탐색에 대한 완벽한 TypeScript 지원
- **컴포저블 아키텍처**: 컴포저블을 사용하여 라우팅 상태 및 탐색에 액세스
- **경로 문법**: 매개변수와 일치하는 유연한 경로(`:p`, `:p?`, `:p*`, `:p+`, `*`)
- **쿼리 문자열 지원**: 쿼리 매개변수의 기본 구문 분석 및 직렬화
- **중첩 경로**: 계층적 경로 구조 지원

## 메인 모듈 및 내보내기

### 핵심 노선 모델

프레임워크 중립적 경로 정의 시스템:

**`MpRoute`**: 경로, 이름, 메타데이터가 포함된 단일 경로를 나타냅니다.

**`defineRoutes`**: 경로 정의 배열에서 경로 트리를 생성합니다.

**예:**

```typescript
import { defineRoutes } from '@mission-platform/router';

const routes = defineRoutes([
  {
    path: '/',
    name: 'home',
    component: HomePage,
  },
  {
    path: '/about',
    name: 'about',
    component: AboutPage,
  },
  {
    path: '/users/:id',
    name: 'user-profile',
    component: UserProfile,
  },
]);
```

### 경로 유틸리티

**`matchRoutes`**: 경로 트리와 위치를 일치시키고 일치하는 경로를 반환합니다.

**예:**

```typescript
import { matchRoutes } from '@mission-platform/router';

const matches = matchRoutes(routes, '/users/123');
matches.forEach((match) => {
  console.log(match.route.name, match.params);
});
```

### 위치 유틸리티

**`resolveLocation`**: 경로 위치를 URL 경로로 확인합니다.

**예:**

```typescript
import { resolveLocation } from '@mission-platform/router';

const location = resolveLocation({
  name: 'user-profile',
  params: { id: '123' },
});
console.log(location.path); // '/users/123'
```

## 프레임워크 어댑터

어댑터는 프레임워크별 하위 경로로 노출되지 **않습니다**. `@mission-platform/router`은 다음을 선언합니다.
단일 `.` 항목에 대한 `mp:<framework>` 내보내기 조건이므로 프레임워크를 **한 번** 선택합니다.
Vite의 `resolve.conditions`(`defineFrameworkAppConfig`/`frameworkResolveConditions` 참조)
`@mission-platform/vite-config`) 및 TypeScript의 `customConditions`(
`@mission-platform/typescript-config/framework-<name>` 사전 설정) — 그런 다음 베어 지정자를 사용하여 모든 것을 가져옵니다.
각 어댑터 빌드는 전체 중립 코어도 다시 내보냅니다.

### Vue 어댑터(`mp:vue` 조건)

Vue 특정 어댑터는 `vue-router`과의 통합을 제공합니다.

**주요 수출품:**

- **`createMpRouter`**: 중립 경로에서 Vue 라우터 인스턴스를 생성합니다.
- **`useMpRouter`**: 라우터 인스턴스에 액세스하기 위해 구성 가능
- **`useMpRoute`**: 현재 경로 정보에 액세스하도록 구성 가능
- **`MpRouterLink`**: 프레임워크 중립 라우터 링크 구성요소

**예:**

```vue
<template>
  <div>
    <MpRouterLink to="/">Home</MpRouterLink>
    <MpRouterLink to="/about">About</MpRouterLink>

    <router-view />
  </div>
</template>

<script setup lang="ts">
  import { MpRouterLink, createMpRouter } from '@mission-platform/router';
  import { createApp } from 'vue';
  import routes from './routes';

  const router = createMpRouter({
    routes,
    history: 'web', // or 'hash' or 'memory'
  });

  createApp(App).use(router).mount('#app');
</script>
```

### React 어댑터(`mp:react` 조건)

React 어댑터는 React 라우터와의 통합을 제공합니다.

**주요 수출품:**

- **`withMpRouter`**: 라우터 컨텍스트를 제공하는 HOC
- **`useMpRoute`**: 현재 경로 정보에 액세스하기 위한 후크
- **`MpLink`**: React용 프레임워크 중립 링크 구성 요소

### RedwoodSDK 어댑터(`./redwood`)

RedwoodSDK는 `mp:*` 프레임워크 중 하나가 아니므로 전용 하위 경로를 유지합니다. 이는 다음과의 통합을 제공합니다.
`rwsdk/router` — RedwoodSDK에서 사용하는 단순 요청/응답 경로 테이블(Cloudflare Workers의 React)

**주요 수출품:**

- **`toRedwoodRoutes`**: 중립 `MpRoute` 트리를 `rwsdk` 경로 정의의 단순 목록으로 변환합니다(중첩됨).
  경로는 절대 경로로 평면화됩니다.
- **`renderRoutes`**: 번역된 경로를 문서로 래핑하여 미러링
  `rwsdk`의 `render(Document, routes, options)`.
- **`toRedwoodPath`**: 중립 경로 패턴을 Redwood의 문법으로 변환합니다(`:param` 및 `*` 와일드카드만;
  `:param?` → `:param`, `:param*` / `:param+`
  → `*`).
- **`redwoodHref`** / **`createRedwoodLinks`**: RedwoodSDK 이후 중립 위치에서 앱 관련 href를 빌드합니다.
  일반 앵커로 탐색합니다.

**예:**

```tsx
// worker.tsx
import { defineApp } from 'rwsdk/worker';
import { renderRoutes } from '@mission-platform/router/redwood';
import { Document } from '@/app/Document';
import { HomePage } from '@/app/pages/HomePage';
import { UserPage } from '@/app/pages/UserPage';

const routes = [
  { path: '/', component: HomePage },
  { path: '/users/:id', name: 'user', component: UserPage },
];

export default defineApp([renderRoutes(Document, routes)]);
```

## 기술적인 세부사항

### 종속성

**핵심 패키지:**

- **TypeScript**: 유형 정의 및 유형 안전성
- **프레임워크 종속성 없음**: 순수 JavaScript/TypeScript

**Vue 어댑터:**

- **vue-router**: 공식 Vue 라우터 라이브러리
- **vue**: Vue 3코어

**React 어댑터:**

- **react-router-dom**: React 웹 애플리케이션용 라우터
- **react**: React 코어

### 건축학

패키지는 계층화된 아키텍처를 따릅니다.

1. **핵심 레이어**: 프레임워크 중립적 경로 모델 및 유틸리티
2. **어댑터 레이어**: 프레임워크별 구현(Vue, React)
3. **공개 API**: 모든 프레임워크를 위한 통합 인터페이스

### 경로 문법

라우터는 다음 경로 매개변수 패턴을 지원합니다.

- `:param`: 필수 매개변수(예: `/users/:id`)
- `:param?`: 선택적 매개변수(예: `/users/:id?`)
- `:param*`: 0개 이상의 매개변수(예: `/files/:path*`)
- `:param+`: 하나 이상의 매개변수(예: `/files/:path+`)
- `*`: 포괄적인 와일드카드(예: `/*`)

## 통합 가이드

### Vue을 사용한 기본 설정

1. 패키지를 설치합니다:

```bash
pnpm add @mission-platform/router vue-router
```

2. 경로를 정의하십시오.

```typescript
// src/routes.ts
import { defineRoutes } from '@mission-platform/router';
import HomePage from './pages/Home.vue';
import AboutPage from './pages/About.vue';

export default defineRoutes([
  {
    path: '/',
    name: 'home',
    component: HomePage,
  },
  {
    path: '/about',
    name: 'about',
    component: AboutPage,
  },
]);
```

3. 라우터를 생성합니다:

```typescript
// src/router.ts
import { createMpRouter } from '@mission-platform/router';
import routes from './routes';

export default createMpRouter({
  routes,
  history: 'web',
});
```

4. 앱에서 사용:

```vue
// src/App.vue
<script setup lang="ts">
  import { MpRouterLink } from '@mission-platform/router';
</script>

<template>
  <nav>
    <MpRouterLink to="/">Home</MpRouterLink>
    <MpRouterLink to="/about">About</MpRouterLink>
  </nav>
  <router-view />
</template>
```

### 동적 경로 일치

```vue
<script setup lang="ts">
  import { useMpRoute } from '@mission-platform/router';

  const route = useMpRoute();

  console.log(route.params.id); // Access dynamic parameters
  console.log(route.query.search); // Access query parameters
</script>
```

### 프로그래밍 방식 탐색

```vue
<script setup lang="ts">
  import { useMpRouter } from '@mission-platform/router';

  const router = useMpRouter();

  const goToAbout = () => {
    router.push('/about');
  };

  const navigateWithParams = () => {
    router.push({
      name: 'user-profile',
      params: { id: '123' },
      query: { tab: 'details' },
    });
  };
</script>
```

## 고급 기능

### 경로 메타 필드

커스텀 로직을 위해 경로에 메타데이터를 추가합니다.

```typescript
const routes = defineRoutes([
  {
    path: '/admin',
    name: 'admin',
    component: AdminPage,
    meta: {
      requiresAuth: true,
      adminOnly: true,
    },
  },
]);
```

### 루트 가드(Vue)

```typescript
import { createMpRouter } from '@mission-platform/router';

const router = createMpRouter({
  routes,
  history: 'web',
});

router.beforeEach((to, from, next) => {
  if (to.meta.requiresAuth && !isAuthenticated()) {
    next('/login');
  } else {
    next();
  }
});
```

### 중첩된 경로

```typescript
const routes = defineRoutes([
  {
    path: '/app',
    name: 'app',
    component: AppLayout,
    children: [
      {
        path: 'dashboard',
        name: 'dashboard',
        component: DashboardPage,
      },
      {
        path: 'settings',
        name: 'settings',
        component: SettingsPage,
      },
    ],
  },
]);
```

## 모범 사례

1. **경로 구성**: 관련 경로를 그룹화하고 레이아웃 구성 요소에 중첩 경로를 사용합니다.
2. **명명된 경로**: 프로그래밍 방식 탐색에는 항상 명명된 경로를 사용합니다.
3. **매개변수 유효성 검사**: 경로 구성요소의 동적 매개변수 유효성을 검사합니다.
4. **오류 처리**: 포괄적인 경로(`/*`)를 사용하여 404건의 사례를 처리합니다.
5. **지연 로딩**: 코드 분할을 위해 동적 가져오기 사용(프레임워크별)
6. **유형 안전성**: 경로 매개변수 및 쿼리 객체에 대한 인터페이스 정의
7. **쿼리 관리**: 쿼리 매개변수를 단순하고 URL로부터 안전하게 유지하세요.

## 마이그레이션 가이드

### Vue 라우터에서 직접

vue-라우터에서 @mission-platform/router으로 마이그레이션하는 경우:

1. `createRouter`을 `createMpRouter`로 교체
2. `defineRoutes`를 사용하도록 경로 정의를 변환합니다.
3. `<router-link>`을 `<MpRouterLink>`로 교체
4. 컴포저블 업데이트: `useRoute()` → `useMpRoute()`, `useRouter()` → `useMpRouter()`

### React 라우터에서 직접

react-router-dom에서 마이그레이션하는 경우:

1. `defineRoutes`으로 중립 형식을 사용하여 경로를 정의합니다.
2. `<Link>`을 `<MpLink>`로 교체
3. `useRoute()` 대신 `useMpRoute()`을 사용하십시오.
4. 라우터 액세스를 위해 `withMpRouter`로 구성요소 래핑

### Next.js에서

Next.js 애플리케이션의 경우 다음을 고려하세요.

- 일관성을 위해 중립 경로 정의 사용
- 필요한 경우 사용자 정의 어댑터 레이어 생성
- 중립 모델과 함께 Next.js 파일 기반 라우팅 활용
