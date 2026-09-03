# @mission-platform/router

由规范英文源进行的机器辅助翻译。必要时请人工审校。包名、命令、路径与技术标识符保持不变。

> packages/core/router/docs/index.md: [packages/core/router/docs/index.md](../../index.md)
> 语言: 简体中文 (zh)

与框架无关的路由库，为 Vue、React 和 React 提供统一的路由模型和每框架适配器
其他框架。

## 概述

`@mission-platform/router` 包实现了一个**框架中立的路由系统**，它将路由分开
来自特定于框架的实现细节的定义和匹配逻辑。这允许您一次定义路线
并在不同框架中使用它们，同时保持一致性。

## 主要特点

- **与框架无关的核心**：以跨框架工作的中性格式定义路由
- **类型安全 API**：对路线定义和导航的完整 TypeScript 支持
- **可组合架构**：使用可组合项访问路由状态和导航
- **路径语法**：灵活的路径与参数匹配（`:p`、`:p?`、`:p*`、`:p+`、`*`）
- **查询字符串支持**：内置查询参数的解析和序列化
- **嵌套路由**：支持分层路由结构

## 主要模块及出口

### 核心路线模型

框架中立的路由定义系统：

**`MpRoute`**：表示具有路径、名称和元数据的单个路由。

**`defineRoutes`**：从路由定义数组创建路由树。

**例子：**

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

### 路径实用程序

**`matchRoutes`**：将位置与路由树进行匹配并返回匹配的路由。

**例子：**

```typescript
import { matchRoutes } from '@mission-platform/router';

const matches = matchRoutes(routes, '/users/123');
matches.forEach((match) => {
  console.log(match.route.name, match.params);
});
```

### 位置实用程序

**`resolveLocation`**：将路由位置解析为 URL 路径。

**例子：**

```typescript
import { resolveLocation } from '@mission-platform/router';

const location = resolveLocation({
  name: 'user-profile',
  params: { id: '123' },
});
console.log(location.path); // '/users/123'
```

## 框架适配器

适配器**不**作为每个框架的子路径公开。 `@mission-platform/router` 声明
`mp:<framework>` 在其单个 `.` 条目上导出条件，因此您选择框架**一次** —
Vite 中的 `resolve.conditions`（请参阅 `defineFrameworkAppConfig` / `frameworkResolveConditions`
`@mission-platform/vite-config`）和 TypeScript 中的 `customConditions`（通过
`@mission-platform/typescript-config/framework-<name>` 预设） - 然后使用裸说明符导入所有内容。
每个适配器构建也会重新导出整个中性核心。

### Vue 适配器（`mp:vue` 条件）

Vue 专用适配器提供与 `vue-router` 的集成。

**主要出口产品：**

- **`createMpRouter`**：从中性路由创建 Vue 路由器实例
- **`useMpRouter`**：可组合访问路由器实例
- **`useMpRoute`**：可组合以访问当前路线信息
- **`MpRouterLink`**：框架中立的路由器链接组件

**例子：**

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

### React 适配器（`mp:react` 条件）

React 适配器提供与 React 路由器的集成。

**主要出口产品：**

- **`withMpRouter`**：HOC 提供路由器上下文
- **`useMpRoute`**：访问当前路线信息的钩子
- **`MpLink`**：React 的框架中立链接组件

### RedwoodSDK 适配器 (`./redwood`)

RedwoodSDK 不是 `mp:*` 框架之一，因此它保留了专用的子路径。它提供与
`rwsdk/router` — RedwoodSDK 使用的平面请求/响应路由表（Cloudflare Workers 上的 React）。

**主要出口产品：**

- **`toRedwoodRoutes`**：将中性 `MpRoute` 树转换为 `rwsdk` 路由定义的平面列表（嵌套
  路线被扁平化为绝对路径）。
- **`renderRoutes`**：将翻译后的路由包装在文档中，镜像
  `rwsdk` 的 `render(Document, routes, options)`。
- **`toRedwoodPath`**：将中性路径模式转换为 Redwood 语法（仅限 `:param` 和 `*` 通配符；
  `:param?` → `:param`、`:param*` / `:param+`
  → `*`)。
- **`redwoodHref`** / **`createRedwoodLinks`**：自 RedwoodSDK 以来，从中立位置构建应用程序相对的 href
  使用普通锚点进行导航。

**例子：**

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

## 技术细节

### 依赖关系

**核心包：**

- **TypeScript**：类型定义和类型安全
- **无框架依赖性**：纯 JavaScript/TypeScript

**Vue 适配器：**

- **vue-router**：官方 Vue 路由器库
- **vue**：Vue 3 核

**React 适配器：**

- **react-router-dom**：React 用于 Web 应用程序的路由器
- **react**：React 核心

### 建筑学

该包遵循分层架构：

1. **核心层**：框架中立的路由模型和实用程序
2. **适配器层**：特定于框架的实现（Vue、React）
3. **公共API**：所有框架的统一接口

### 路径语法

路由器支持以下路径参数模式：

- `:param`：必需参数（例如 `/users/:id`）
- `:param?`：可选参数（例如 `/users/:id?`）
- `:param*`：零个或多个参数（例如 `/files/:path*`）
- `:param+`：一个或多个参数（例如 `/files/:path+`）
- `*`：通用通配符（例如 `/*`）

## 集成指南

### Vue 的基本设置

1.安装包：

```bash
pnpm add @mission-platform/router vue-router
```

2. 定义您的路线：

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

3.创建路由器：

```typescript
// src/router.ts
import { createMpRouter } from '@mission-platform/router';
import routes from './routes';

export default createMpRouter({
  routes,
  history: 'web',
});
```

4. 在您​​的应用程序中使用：

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

### 动态路由匹配

```vue
<script setup lang="ts">
  import { useMpRoute } from '@mission-platform/router';

  const route = useMpRoute();

  console.log(route.params.id); // Access dynamic parameters
  console.log(route.query.search); // Access query parameters
</script>
```

### 程序化导航

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

## 高级功能

### 路由元字段

将元数据添加到自定义逻辑的路由：

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

### 路由守卫 (Vue)

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

### 嵌套路由

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

## 最佳实践

1. **路由组织**：将相关路由分组在一起，并使用嵌套路由进行布局组件
2. **命名路由**：始终使用命名路由进行编程导航
3. **参数验证**：验证路由组件中的动态参数
4. **错误处理**：使用包罗万象的路由处理 404 情况 (`/*`)
5. **延迟加载**：使用动态导入进行代码分割（特定于框架）
6. **类型安全**：定义路由参数和查询对象的接口
7. **查询管理**：保持查询参数简单且URL安全

## 迁移指南

### 直接来自 Vue 路由器

从 vue-router 迁移到 @mission-platform/router 时：

1. 将 `createRouter` 替换为 `createMpRouter`
2. 将路由定义转换为使用 `defineRoutes`
3. 将 `<router-link>` 替换为 `<MpRouterLink>`
4. 更新可组合项：`useRoute()` → `useMpRoute()`、`useRouter()` → `useMpRouter()`

### 直接来自 React 路由器

从 react-router-dom 迁移时：

1. 使用 `defineRoutes` 使用中性格式定义路由
2. 将 `<Link>` 替换为 `<MpLink>`
3. 使用 `useMpRoute()` 代替 `useRoute()`
4. 用 `withMpRouter` 包裹组件以进行路由器访问

### 来自 Next.js

对于 Next.js 应用程序，请考虑：

- 使用中性路由定义以保持一致性
- 如果需要，创建自定义适配器层
- 利用 Next.js 基于文件的路由以及中性模型
