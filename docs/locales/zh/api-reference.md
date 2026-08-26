# Package API Directory

This project-wide page is a directory of package capabilities and compatibility
contracts. The canonical installation, usage, limitations, and API details for
each package live beside that package under `packages/*/docs/`, `configs/*/docs/`,
and `forge-plugins/*/docs/`. Generated API references must be added to the owning
package rather than this page.

> **进口始终是裸露的。** 框架运输 `@mission-platform/*` 包暴露单个 `.`
> 入口处由 `mp:vue`, `mp:react`, `mp:solid`， 和 `mp:web-component` 出口
> 条件。选择框架**一次** — 通过 `resolve.conditions` （看 `defineFrameworkAppConfig` /
> `frameworkResolveConditions` 从 `@mission-platform/vite-config`) 和 `customConditions` （通过
> `@mission-platform/typescript-config/framework-<name>` 预设） - 然后用裸导入所有内容
> 包说明符。看 [外部消费者设置](external-consumer-setup.md). Select the framework **once** — via `resolve.conditions` (see `defineFrameworkAppConfig` /
> `frameworkResolveConditions` from `@mission-platform/vite-config`) and `customConditions` (via the
> `@mission-platform/typescript-config/framework-<name>` presets) — then import everything with the bare
> package specifier. See [External Consumer Setup](./external-consumer-setup.md).

## 核心框架

### @mission-platform/forge

“一次写入”架构的基础，提供框架中立的 JSX 运行时和挂钩。

| 出口                 | 类型   | 描述                                                                     |
| :----------------- | :--- | :--------------------------------------------------------------------- |
| `h`, `Fragment`    | 功能   | 用于创作组件的 JSX 工厂和片段。                                                     |
| `useState`         | Hook | 框架中立的状态钩子。                                                             |
| `useEffect`        | Hook | 框架中性效果钩子。                                                              |
| `useMemo`          | Hook | 框架中立的记忆钩子。                                                             |
| `useRef`           | Hook | 框架中立的参考钩子。                                                             |
| `useContext`       | Hook | 框架中立的上下文挂钩。                                                            |
| `toVueComponent`   | 适配器  | 将锻造组件转换为 Vue 3 个组件（来自 `@mission-platform/forge/vue`).  |
| `toReactComponent` | 适配器  | 将锻造组件转换为 React 组件（来自 `@mission-platform/forge/react`). |

### @mission-platform/vite-plugin-forge

The compiler driver accepts explicit `FrameworkOutputPlugin` instances; it does
not provide a framework registry. `defineViteForgeComponents` and
`defineTsdownForgeComponents` (plus the hook and CMS helpers) share an in-process
`ForgeCompilerService` for one build or watch session.

| 适配器                | 描述                                                                                                                                                                                  |
| :----------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Service lifecycle  | Reuse source, graph, parsed-source, semantic-IR, and target-artifact state across builds; dispose one-shot services after completion and watcher services on close. |
| Cache keys         | Source/dependency/config fingerprints, compiler and router options, `tsconfig` `baseUrl`/`paths`, target ID, plugin identity/version, and relevant conditions.      |
| Watch invalidation | Changed files invalidate reverse graph dependents, including transitive component and hook entries; unrelated target snapshots remain reusable.                     |
| Diagnostics/report | Reports phase timing, cache hit/miss counts, affected files, warnings, errors, and emitted artifact counts. Errors block promotion.                 |
| Artifact manifest  | Lists target-scoped entries, modules, declarations, source maps, assets, and checksums before atomic promotion.                                                     |
| Extension point    | Implement and pass a `FrameworkOutputPlugin` from a caller-owned `forge-plugin-*` package; do not add target branches to the neutral driver.                        |

Configure aliases through the project `tsconfig.json` (`baseUrl` and
`paths`); Vite and tsdown graph preparation use the same alias facts. Router
selection, router plugins, and conditions are forwarded through component and
hook helpers. A future worker/daemon may sit behind the service contract, but
the supported implementation is currently in-process.

### @mission-platform/router

Framework-neutral route contracts, pure matching helpers, and compiler markers for
shared packages. Applications own route records and native router instances; the
Forge router target selected by the application supplies the runtime capabilities.

| Export / package                                                     | 类型               | 描述                                                                                                                                                    |
| :------------------------------------------------------------------- | :--------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MpRoute`                                                            | 钩                | Route records, params, query/hash state, metadata, and navigation targets.                                                            |
| `defineRoutes`                                                       | 功能               | Define route trees and resolve paths without a DOM or framework runtime.                                                              |
| `MpNavigationResult`, `MpRouteGuard`, `MpHistory`, `MpRouterAdapter` | 类型               | Navigation outcomes/events, guards, pluggable history, and adapter contracts.                                                         |
| `useMpRoute`                                                         | Compiler markers | Neutral link, route-state, navigation, resolution, and outlet capabilities consumed by shared packages.                               |
| `@mission-platform/forge-router-*`                                   | 出口               | Independently selected native router targets for Vue Router, React Router, SolidJS Router, SvelteKit, RedwoodSDK, and Web Components. |

Runtime packages own history and reactive state; the neutral package never imports a UI framework. For Web Components,
register the elements once and pass complex targets through DOM properties rather than serialized attributes:

```ts
import {
  MpMemoryHistory,
  createWebComponentsRouter,
  registerRouterElements,
  setForgeRouter,
} from '@mission-platform/forge-router-web-components/runtime';

registerRouterElements();
const router = createWebComponentsRouter({
  history: new MpMemoryHistory('/overview'),
  routes: [{ path: '/overview', component: () => 'Documentation' }],
});
setForgeRouter(router);
const link = document.createElement('forge-router-link');
link.to = { path: '/overview', query: { q: 'router' }, hash: 'results' };
link.router = router;
```

## 用户界面与设计

### @mission-platform/tokens

颜色、排版和间距的集中设计标记。

| 出口            | 描述                                                              |
| :------------ | :-------------------------------------------------------------- |
| `tokens`      | 包含所有设计标记的 JS/TS 对象（例如， `tokens.color.primary`). |
| `tokens.scss` | 用于样式表的 SCSS 变量。                                                 |

### @mission-platform/breakpoints

响应式实用程序和可见性组件。

| 出口               | 类型   | 描述              |
| :--------------- | :--- | :-------------- |
| `useBreakpoints` | Hook | 返回反应断点状态。       |
| `ShowIf`         | 组件   | 仅当断点条件匹配时才渲染子项。 |
| `HideIf`         | 组件   | 当断点条件匹配时隐藏子项。   |

### @mission-platform/components

共享 UI 组件只需编写一次即可用于多个框架。

- **导入**：始终 `@mission-platform/components`;活跃的 `mp:<framework>` 条件决定你是否得到
  Vue 3, React, Solid，或网络组件构建。
- **每个组件子路径**： `@mission-platform/components/<path>` (e.g.
  `@mission-platform/components/atoms/forge-badge/forge-badge`) 也是条件感知的，并且只加载该组件的
  块。
- **成分**： `ForgeButton`, `ForgeInput`, `ForgeModal`，等等。

## 功能包

### @mission-platform/i18n

基于i18next的国际化系统。

| 出口                | 描述                  |
| :---------------- | :------------------ |
| `createForgeI18N` | 使用平台默认值初始化 i18n 实例。 |
| `useI18n`         | 用于组件中翻译和区域设置切换的挂钩。  |

### @mission-platform/seo

元标记和 SEO 管理。

| 出口       | 描述                          |
| :------- | :-------------------------- |
| `useSeo` | 用于以声明方式设置页面标题、元标记和开放图数据的挂钩。 |

### @mission-platform/map

MapLibre GL 的反应式包装器。

| 组件              | 描述             |
| :-------------- | :------------- |
| `<MpMap>`       | 主要地图容器组件。      |
| `<MpMapMarker>` | 用于在地图上放置标记的组件。 |

### @mission-platform/code-scanner

基于摄像头的条形码和二维码扫描。

| 组件                | 描述                |
| :---------------- | :---------------- |
| `<MpCodeScanner>` | 初始化相机流并发出扫描结果的组件。 |

## 集成

### @mission-platform/rxjs

将 RxJS Observables 桥接到组件状态。

| Hook            | 描述                    |
| :-------------- | :-------------------- |
| `useObservable` | 订阅可观察对象并返回其最新值作为反应状态。 |

### @mission-platform/d3

框架中立的 D3.js 集成。

| Hook    | 描述                      |
| :------ | :---------------------- |
| `useD3` | 通过生命周期管理将 D3 选择绑定到组件引用。 |

### @mission-platform/hunspell

WebAssembly 支持的拼写检查。

| 出口             | 钩                               |
| :------------- | :------------------------------ |
| `initHunspell` | 加载并实例化 Hunspell WebAssembly 模块。 |
| `spell`        | 检查单词拼写是否正确。                     |
| `suggest`      | 提供单词的拼写建议。                      |

## 进一步阅读

- [Vue 2 至 Vue 3 迁移指南](migration-guides/vue2-to-vue3.md)
- [项目配置概述](configs/index.md)
- [工作区结构](workspace-structure.md)

## 完整的工作空间包索引

以下索引是从包清单中生成的，并保存在此处，以便公共 API 参考涵盖每个
封装在 `packages/`，包括类型化的 WebAssembly 外观。

### 核心和用户界面

| 套餐                             | 目的                    |
| :----------------------------- | :-------------------- |
| `@mission-platform/forge`      | 框架中立的 JSX 运行时和适配器。    |
| `@mission-platform/components` | 一次性编写 UI 组件。          |
| `@mission-platform/icons`      | 一次性编写 SVG 图标组件。       |
| `@mission-platform/layouts`    | 应用程序、容器和响应式布局组件。      |
| `@mission-platform/forms`      | 模式表单和视觉表单生成器组件。       |
| `@mission-platform/forms-core` | 模式派生、验证和表单构建器域逻辑。     |
| `@mission-platform/tokens`     | CSS 自定义属性和 SCSS 设计令牌。 |

### 可组合性和集成

| 套餐                                              | 目的                                                                           |
| :---------------------------------------------- | :--------------------------------------------------------------------------- |
| `@mission-platform/breakpoints`                 | 响应式断点状态和可见性助手。                                                               |
| `@mission-platform/d3`                          | D3 选择生命周期可组合项和保证金实用程序。                                                       |
| `@mission-platform/i18n`                        | i18next 状态和框架集成助手。                                                           |
| `@mission-platform/map`                         | MapLibre 地图组件和可组合项。                                                          |
| `@mission-platform/observers`                   | 交集、突变和性能观察者可组合项。                                                             |
| `@mission-platform/phone-number`                | 键入 WebAssembly 电话号码解析和格式化。                                                   |
| `@mission-platform/router`                      | Framework-neutral route contracts and compiler capabilities. |
| `@mission-platform/forge-router-web-components` | Web Components router target and framework-free runtime.     |
| `@mission-platform/rxjs`                        | RxJS 可观察对象和订阅可组合对象。                                                          |
| `@mission-platform/scheduler`                   | 调度程序 UI、重复周期和日历布局域逻辑。                                                        |
| `@mission-platform/vcard`                       | RFC 6350 vCard 和 RFC 5545 iCalendar 数据和组件。                                   |
| `@mission-platform/content`                     | 内容 AST、构建器、Monaco、Markdown 和 WYSIWYG 组件。                                     |
| `@mission-platform/seo`                         | 元数据、开放图谱和结构化数据可组合项。                                                          |
| `@mission-platform/speech-audio`                | 语音、音频和 Web MIDI 可组合项。                                                        |
| `@mission-platform/three`                       | Three.js 画布和生命周期可组合项。                                        |

### 代码和 WebAssembly 包

| 套餐                               | 目的                                                               |
| :------------------------------- | :--------------------------------------------------------------- |
| `@mission-platform/barcode`      | 一维条形码编码/解码外观和组件。                                                 |
| `@mission-platform/code-scanner` | Camera and image code-scanning component.        |
| `@mission-platform/matrix-code`  | Data Matrix and Aztec encode/decode façade.      |
| `@mission-platform/qr-code`      | QR encode/decode façade and component.           |
| `@mission-platform/harper`       | Harper grammar and style integration for Monaco. |
| `@mission-platform/hunspell`     | Emscripten Hunspell spell-checking wrapper.      |

### Forge 编译器目标

These live in `forge-plugins/` rather than `packages/`. A **framework** plugin decides which runtime a neutral component
is lowered to; a **CMS** target decides which content platform it is projected onto. The two axes compose, so any CMS
target may be bound to any framework plugin. See the [Forge Compiler Pipeline](../vite-plugins/forge/docs/reference/compiler.md).

| 套餐                                              | 目的                                                          |
| :---------------------------------------------- | :---------------------------------------------------------- |
| `@mission-platform/forge-plugin-api`            | `FrameworkOutputPlugin` 契约、语义 IR 类型和构建适配器类型。                |
| `@mission-platform/forge-plugin-react`          | React 输出目标。                                                 |
| `@mission-platform/forge-plugin-vue`            | Vue 3输出目标。                                                  |
| `@mission-platform/forge-plugin-solid`          | Solid 输出目标。                                                 |
| `@mission-platform/forge-plugin-svelte`         | Svelte 5输出目标。                                               |
| `@mission-platform/forge-plugin-web-components` | Web 组件输出目标。                                                 |
| `@mission-platform/forge-cms-plugin-api`        | `CmsOutputPlugin` 合约、中性内容模型、CMS 驱动程序和构建助手。                  |
| `@mission-platform/forge-cms-storyblok`         | Storyblok 组件对象、blok 包装器和 `components.json`. |
| `@mission-platform/forge-cms-astro`             | 静止的 `.astro` 模板和 `client:load` 框架岛。                         |
| `@mission-platform/forge-cms-ghost`             | Ghost 车把部分和 `config.custom` 主题片段。                           |
| `@mission-platform/forge-cms-jekyll`            | Jekyll 液体包括， `_data` 架构和一个 `_config.yml` 分段。                |
| `@mission-platform/forge-cms-webflow`           | 网络流 `declareComponent` 代码组件和 `webflow.json` 库片段。            |

#### @mission-platform/forge-cms-plugin-api

| 出口                        | 类型 | 描述                                                                                              |
| :------------------------ | :- | :---------------------------------------------------------------------------------------------- |
| `analyzeContentComponent` | 功能 | 将中立组件的 props 投影到平台中立内容模型上。                                                                      |
| `ContentComponent`        | 类型 | 已订购 `ContentField`s、插槽和 `interactive` 旗帜。                                                       |
| `ContentFieldKind`        | 类型 | `text`, `richtext`, `number`, `boolean`, `option`, `asset`, `link`, `children`. |
| `CmsOutputPlugin`         | 类型 | 目标合约：一个绑定框架插件加上四个发射器。                                                                           |
| `defineForgeCmsPlugin`    | 功能 | 在配置时验证 CMS 目标。                                                                                  |
| `generateCmsArtifacts`    | 功能 | 通用发现 → IR → 内容模型 → 发出 → 写入驱动程序。                                                                 |
| `defineTsdownForgeCms`    | 功能 | 一个 CMS 目标的 tsdown 配置，发出 `dist/cms/<cms>/<framework>/**`.                        |
| `defineTsdownForgeCmsAll` | 功能 | CMS 目标列表的 tsdown 配置。                                                                            |
