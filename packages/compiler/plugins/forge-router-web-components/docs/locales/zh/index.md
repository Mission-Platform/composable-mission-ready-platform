# @mission-platform/forge-router-web-components

由规范英文源进行的机器辅助翻译。必要时请人工审校。包名、命令、路径与技术标识符保持不变。

> packages/compiler/plugins/forge-router-web-components/docs/index.md: [packages/compiler/plugins/forge-router-web-components/docs/index.md](../../index.md)
> 语言: 简体中文 (zh)

Forge 无框架 Web 组件的路由器目标。

## 异步路由加载

使用 `loadingFallback` 在异步路由视图解析时显示微调器。
`forge-router-outlet` 将后备渲染为覆盖并保留当前
视图已安装，直到目的地准备就绪：

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

成功、重定向、取消或成功后，出口会删除叠加层
失败。路线视图承诺在导航和插座安装之间共享，
所以惰性工厂不会被调用两次。过时的迟到结果
导航无法取代较新的视图。

`forge-router-link` 是作用域 SPA 入口点。它通过更新历史记录
默认情况下为 `push`，或设置 `replace` 特性/属性时为 `replace`，
更新其 `active` 和 `exact-active` 状态，并保留修改后的点击，
非主要点击、下载、外部 URL 以及指向本机的目标链接
浏览器。

## 框架中立 `Suspense`

共享 Forge 源代码可以使用中立边界并让每个编译器降低它
到目标本机实现：

```tsx
<Suspense fallback={<LoadingSpinner label="Loading documentation" />}>
  <DocumentationRoute />
</Suspense>
```

对于 Web 组件，请使用路由器出口的 `loadingFallback` 合约
路线转换；没有框架运行时或全局锚拦截
需要。
