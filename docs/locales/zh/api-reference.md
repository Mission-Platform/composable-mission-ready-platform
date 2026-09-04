# 包API目录

由规范英文源进行的机器辅助翻译。必要时请人工审校。包名、命令、路径与技术标识符保持不变。

> docs/api-reference.md: [docs/api-reference.md](../../api-reference.md)
> 语言: 简体中文 (zh)

这个项目范围的页面是包功能和兼容性的目录
合同。规范安装、使用、限制和 API 详细信息
每个包都位于 `packages/**/docs/`、` ` 下的该包旁边，
和 ` `。生成的 API 引用必须添加到所属的 API 引用中
包而不是这个页面。

> **导入始终是裸露的。** 框架传送 `@mission-platform/*` 包公开单个 `.`
> 由 `mp:vue`、`mp:react`、`mp:solid` 和 `mp:web-component` 导出保护的条目
> 条件。选择框架**一次** — 通过 `resolve.conditions`（请参阅 `defineFrameworkAppConfig` /
> `frameworkResolveConditions` 来自 `@mission-platform/vite-config`) 和 `customConditions` (通过
> `@mission-platform/typescript-config/framework-<name>` 预设) — 然后用裸露导入所有内容
> 包说明符。请参阅[外部使用者设置](external-consumer-setup.md)。

## 核心框架

### @mission-platform/forge-jsx

“一次写入”架构的基础，提供框架中立的 JSX 运行时和挂钩。

|出口|类型 |描述 |
| :----------------- | :------- | :-------------------------------------------------------------------------------------- |
| `h`、`Fragment` |功能|用于创作组件的 JSX 工厂和片段。                                      |
| `useState` |钩|框架中立的状态钩子。                                                           |
| `useEffect` |钩|框架中性效果钩子。                                                          |
| `useMemo` |钩|框架中立的记忆钩子。                                                     |
| `useRef` |钩|框架中立的参考钩子。                                                       |
| `useContext` |钩|框架中立的上下文挂钩。                                                         |
| `toVueComponent` |适配器|将 forge 组件转换为 Vue 3 组件（来自 `@mission-platform/forge-adapters/vue`）。   |
| `toReactComponent` |适配器|将 forge 组件转换为 React 组件（来自 `@mission-platform/forge-adapters/react`）。 |

### @mission-platform/vite-plugin-forge

编译器驱动程序接受显式 `FrameworkOutputPlugin` 实例；确实如此
不提供框架注册表。 `defineViteForgeComponents` 和
`defineTsdownForgeComponents`（加上挂钩和 CMS 帮助程序）共享进程内
`ForgeCompilerService` 用于一次构建或观看会话。

|能力|描述 |
| :----------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
|服务生命周期|跨构建重用源、图、解析源、语义 IR 和目标工件状态；完成后处理一次性服务，并在关闭时处理观察者服务。 |
|缓存键 |源/依赖项/配置指纹、编译器和路由器选项、`tsconfig` `baseUrl`/`paths`、目标 ID、插件标识/版本以及相关条件。      |
|观看失效|更改的文件使反向图依赖项无效，包括传递组件和钩子条目；不相关的目标快照仍然可重用。                     |
|诊断/报告 |报告阶段计时、缓存命中/未命中计数、受影响的文件、警告、错误和发出的工件计数。错误会阻碍晋升。                                 |
|工件清单 |在原子升级之前列出目标范围的条目、模块、声明、源映射、资产和校验和。                                                     |
|扩展点|实现并从调用者拥有的 `forge-plugin-*` 包传递 `FrameworkOutputPlugin`；不要将目标分支添加到中性驱动程序。                        |

通过项目 `tsconfig.json` 配置别名（`baseUrl` 和
`paths`); Vite 和 tsdown 图准备使用相同的别名事实。路由器
选择、路由器插件和条件通过组件转发
钩子助手。未来的工作人员/守护进程可能会坐在服务合同后面，但是
支持的实施目前正在进行中。

### @mission-platform/router

框架中立的路由契约、纯匹配助手和编译器标记
共享包。应用程序拥有路由记录和本机路由器实例；的
应用程序选择的 Forge 路由器目标提供运行时功能。

|出口/包装|类型 |描述 |
| :----------------------------------------------------------------------- | :--------------- | :------------------------------------------------------------------------------------------------------------------------------------ |
| `MpRoute`、`MpRouteLocationRaw`、`MpResolvedLocation` |类型 |路由记录、参数、查询/哈希状态、元数据和导航目标。                                                            |
| `defineRoutes`、`matchRoutes`、`resolveLocation` |功能|无需 DOM 或框架运行时即可定义路由树和解析路径。                                                              |
| `MpNavigationResult`、`MpRouteGuard`、`MpHistory`、`MpRouterAdapter` |类型 |导航结果/事件、防护、可插入历史记录和适配器合约。                                                         |
| `MpLink`、`useMpRoute`、`useMpRouter`、`useMpNavigation`、`MpRouterView` |编译器标记 |共享包消耗的中性链接、路由状态、导航、分辨率和出口功能。                               |
| `@mission-platform/forge-router-*` |锻造目标 |为 Vue 路由器、React 路由器、SolidJS 路由器、SvelteKit、RedwoodSDK 和 Web 组件独立选择本机路由器目标。 |

运行时包拥有自己的历史记录和反应状态；中性包从不导入 UI 框架。对于 Web 组件，
注册元素一次并通过 DOM 属性而不是序列化属性传递复杂目标：

```ts
import {
  MpMemoryHistory,
  createWebComponentsRouter,
  registerRouterElements,
  setForgeRouter,
} from "@mission-platform/forge-router-web-components/runtime";

registerRouterElements();
const router = createWebComponentsRouter({
  history: new MpMemoryHistory("/overview"),
  routes: [{ path: "/overview", component: () => "Documentation" }],
});
setForgeRouter(router);
const link = document.createElement("forge-router-link");
link.to = { path: "/overview", query: { q: "router" }, hash: "results" };
link.router = router;
```

### 异步路线视图和 `Suspense`

Forge 的中立编译器可识别 `Suspense` 并将其降低为本机
所选目标的异步边界。将后备保留在共享源中
因此每个目标都呈现相同的加载状态，而无需导入框架
适配器：

```tsx
<Suspense fallback={<LoadingSpinner label="Loading documentation" />}>
  <DocumentationRoute />
</Suspense>
```

React、Vue、Solid 和 Svelte 接收其本机悬念边界。一个
无框架应用程序使用 Web 组件路由器的出口回退
对于异步路由视图：

```ts
const router = createWebComponentsRouter({
  history: new MpMemoryHistory("/overview"),
  loadingFallback: () => {
    const spinner = document.createElement("span");
    spinner.className = "docs-loading-spinner";
    spinner.setAttribute("aria-label", "Loading documentation");
    return spinner;
  },
  routes: [{ path: "/:slug(.*)", component: loadDocumentationView }],
});
```

路由器从 `forge-router-outlet` 发出加载覆盖，而异步
路线视图解析。当前视图保持安装状态，直到到达目的地
准备就绪，并且在成功、重定向、取消或之后删除覆盖层
失败。

## 用户界面与设计

### @mission-platform/tokens

颜色、排版和间距的集中设计标记。

|出口|描述 |
| :------------ | :------------------------------------------------------------------------ |
| `tokens` |包含所有设计标记的 JS/TS 对象（例如 `tokens.color.primary`）。 |
| `tokens.scss` |用于样式表的 SCSS 变量。                                    |

### @mission-platform/breakpoints

响应式实用程序和可见性组件。

|出口|类型 |描述 |
| :--------------- | :-------- | :--------------------------------------------------------- |
| `useBreakpoints` |钩|返回反应断点状态。                        |
| `ShowIf` |组件|仅当断点条件匹配时才渲染子项。 |
| `HideIf` |组件|当断点条件匹配时隐藏子项。        |

### @mission-platform/components

共享 UI 组件只需编写一次即可用于多个框架。

- **导入**：始终为 `@mission-platform/components`；活动的 `mp:<framework>` 条件决定您是否获得
  Vue 3、React、Solid 或 Web 组件构建。
- **每个组件子路径**：`@mission-platform/components/<path>`（例如
  `@mission-platform/components/atoms/forge-badge/forge-badge`) 也是条件感知的，并且仅加载该组件的
  块。
- **组件**：`ForgeButton`、`ForgeInput`、`ForgeModal` 等。

## 功能包

### @mission-platform/i18n

基于i18next的国际化系统。

|出口|描述 |
| :---------------- | :-------------------------------------------------------- |
| `createForgeI18N` |使用平台默认值初始化 i18n 实例。     |
| `useI18n` |用于组件中翻译和区域设置切换的挂钩。 |

### @mission-platform/seo

元标记和 SEO 管理。

|出口|描述 |
| :------- | :-------------------------------------------------------------------- |
| `useSeo` |用于以声明方式设置页面标题、元标记和开放图数据的挂钩。 |

### @mission-platform/map

MapLibre GL 的反应式包装器。

|组件|描述 |
| :-------------- | :---------------------------------------- |
| `<MpMap>` |主要地图容器组件。             |
| `<MpMapMarker>` |用于在地图上放置标记的组件。 |

### @mission-platform/code-scanner

基于摄像头的条形码和二维码扫描。

|组件|描述 |
| :---------------- | :--------------------------------------------------------------- |
| `<MpCodeScanner>` |初始化相机流并发出扫描结果的组件。 |

## 集成

### @mission-platform/rxjs

将 RxJS Observables 桥接到组件状态。

|钩|描述 |
| :-------------- | :-------------------------------------------------------------------------- |
| `useObservable` |订阅可观察对象并返回其最新值作为反应状态。 |

### @mission-platform/d3

框架中立的 D3.js 集成。

|钩|描述 |
| :------ | :----------------------------------------------------------------- |
| `useD3` |通过生命周期管理将 D3 选择绑定到组件引用。 |

### @mission-platform/hunspell

WebAssembly 支持的拼写检查。

|出口|描述 |
| :------------- | :------------------------------------------------------ |
| `initHunspell` |加载并实例化 Hunspell WebAssembly 模块。 |
| `spell` |检查单词拼写是否正确。                  |
| `suggest` |提供单词的拼写建议。               |

## 服务监控

### 服务监控API

服务监控应用程序提供公共端点和经过身份验证的端点来监控服务运行状况。

#### 公共端点

公共端点仅公开最少的状态信息，并且不需要身份验证：

- **`GET /api/services`**：返回每个受监控服务的汇总状态。响应仅包括每个服务的 `{ id, name, type }`，以及 `now` 和 `intervalSeconds`。不会公开任何目标配置、URL、主机、查询、标头、阈值或拓扑。
- **`GET /api/metrics?service=<id>&since=<ms>`**：返回一项服务的原始时间序列指标。 `since` 参数受配置的保留窗口限制。响应仅包括 `service`、`now`、`since` 和 `samples`。

#### 经过身份验证的端点

经过身份验证的端点需要 `MONITOR_API_TOKEN` 不记名令牌并公开完整的监视器配置：

- **`POST /api/check`**：触发立即探测周期。
- **`GET /api/monitors`**：列出具有完整配置的所有监视器。
- **`POST /api/monitors`**：创建一个新监视器。
- **`PATCH /api/monitors/<id>`**：更新现有监视器。
- **`DELETE /api/monitors/<id>`**：删除监视器并清除其历史计数器。

#### 探测和目的地政策

服务监视器对探测行为实施严格限制：

- **允许的方案**：URL 探测默认为 `https://`（和端口 443），除非启用了受信任的私有模式； `http://` 在可信模式下允许。
- **允许的端口**：URL探测允许端口443；主机探针允许端口基线 [53、80、123、443、1883、8883]。
- **禁止的目的地**：私有/链接本地地址（127.0.0.1、::1、10.0.0.0/8、172.16.0.0/12、192.168.0.0/16、fe80::/10），除非明确信任。
- **请求/响应界限**：探测请求限制为 64 KB；响应限制为 256 KB。速度测试限制为 25 MB。
- **重定向策略**：重定向必须保持在同一来源和批准的路径前缀内；跨源或不允许的路径重定向将被拒绝。
- **历史记录**：事件、更新和维护历史记录受项目计数上限限制（每个监视器最多 100 个项目）。指标数据的默认保留期为 24 小时。

#### 服务器端渲染 (SSR)

在将私有监视器配置序列化到客户端 props 之前，服务监视器 SSR 层需要进行身份验证。未经身份验证的请求仅收到公共状态 DTO。

### 电子邮件发送者工作人员

电子邮件发送器工作人员提供了用于电子邮件渲染和传递的本地开发展示。

#### 部署模式

- **本地开发**（默认）：发送到 `localhost:1025` 上的 MailPit。无需身份验证。
- **非本地部署**：需要显式 `EMAIL_DEPLOYMENT_TOKEN` 承载授权、`EMAIL_ALLOWED_ORIGINS` 白名单和 `EMAIL_ALLOWED_RECIPIENTS` 白名单。通过 `EMAIL_RATE_LIMITER` 强制实施速率限制。

#### 请求验证

所有电子邮件请求必须：

- 使用 `Content-Type: application/json`。
- 包含有效的收件人电子邮件地址（`to` 字段，最多 254 个字符）。
- 包括收件人姓名（`recipientName`，1–100 个字符）。
- 包括完整的电子邮件 HTML（`html`，最大 240 KB）。
- 通过 `assertCompatibleEmailHtml` 通过 HTML 兼容性检查。

#### 故障关闭默认值

没有显式配置的非本地部署将拒绝所有请求。为了方便开发，本地部署不受限制。

## Forge Web 脚本工件验证

### 工件内容标识

Forge Web 脚本工件使用格式为 `sha256-v1:<hex>` 的版本化 SHA-256 内容标识。此摘要是在完整的工件二进制文件上计算的，并存储在工件清单的 `contentHash` 字段中。

#### 完整性与真实性

与可信预期值相比，内容哈希**检测意外或未经授权的内容更改**。它**不**：

- 验证工件的生产者或来源。
- 替换加密签名或部署访问控制。
- 保证工件可以安全执行。

#### 验证工作流程

1. **从可信来源（例如签名清单、CI 构建日志或安全配置）获取预期哈希**。
2. **使用验证器计算工件哈希**：`fws_verify_artifact(artifact)` 返回 `contentHash`。
3. **比较哈希值**：如果它们匹配，则自记录预期值以来，工件未被意外或恶意更改。
4. **验证清单**：使用 `fws_inspect_manifest` 独立检查能力导入、导出、元数据和策略合规性。

#### 版本控制

`sha256-v1` 前缀允许将来的哈希算法升级而不会产生歧义。调用者必须妥善处理旧版（如果有）和当前的摘要格式。

## 进一步阅读

- [Vue 2 到 Vue 3 迁移指南](migration-guides/vue2-to-vue3.md)
- [项目配置概述](packages/tooling/configs/index.md)
- [工作空间结构](workspace-structure.md)

## 完整的工作空间包索引

以下索引是从包清单中生成的，并保存在此处，以便公共 API 参考涵盖每个
`packages/` 中的包，包括类型化的 WebAssembly 外观。

### 核心和用户界面

|套餐 |目的|
| :----------------------------- | :------------------------------------------------------------ |
| `@mission-platform/forge-jsx` |框架中立的 JSX 运行时和适配器。                   |
| `@mission-platform/components` |一次性编写 UI 组件。                                     |
| `@mission-platform/icons` |一次性编写 SVG 图标组件。                               |
| `@mission-platform/layouts` |应用程序、容器和响应式布局组件。     |
| `@mission-platform/forms` |模式表单和视觉表单生成器组件。              |
| `@mission-platform/forms-core` |模式派生、验证和表单构建器域逻辑。 |
| `@mission-platform/tokens` | CSS 自定义属性和 SCSS 设计令牌。                 |

### 可组合性和集成

|套餐 |目的|
| :---------------------------------------------- | :--------------------------------------------------------------- |
| `@mission-platform/breakpoints` |响应式断点状态和可见性助手。              |
| `@mission-platform/d3` | D3 选择生命周期可组合项和保证金实用程序。          |
| `@mission-platform/i18n` | i18next 状态和框架集成助手。                 |
| `@mission-platform/map` | MapLibre 地图组件和可组合项。                         |
| `@mission-platform/observers` |交集、突变和性能观察者可组合项。    |
| `@mission-platform/phone-number` |键入 WebAssembly 电话号码解析和格式化。           |
| `@mission-platform/router` |框架中立的路由契约和编译器功能。     |
| `@mission-platform/forge-router-web-components` | Web 组件路由器目标和无框架运行时。         |
| `@mission-platform/rxjs` | RxJS 可观察对象和订阅可组合对象。                    |
| `@mission-platform/scheduler` |调度程序 UI、重复周期和日历布局域逻辑。      |
| `@mission-platform/vcard` | RFC 6350 vCard 和 RFC 5545 iCalendar 数据和组件。       |
| `@mission-platform/content` |内容 AST、构建器、Monaco、Markdown 和 WYSIWYG 组件。 |
| `@mission-platform/seo` |元数据、开放图谱和结构化数据可组合项。           |
| `@mission-platform/speech-audio` |语音、音频和 Web MIDI 可组合项。                         |
| `@mission-platform/three` | Three.js 画布和生命周期可组合项。                       |

### 代码和 WebAssembly 包

|套餐 |目的|
| :------------------------------- | :----------------------------------------------- |
| `@mission-platform/barcode` |一维条形码编码/解码外观和组件。   |
| `@mission-platform/code-scanner` |摄像头和图像扫码组件。        |
| `@mission-platform/matrix-code` | Data Matrix 和 Aztec 编码/解码外观。      |
| `@mission-platform/qr-code` | QR 编码/解码外观和组件。           |
| `@mission-platform/harper` |摩纳哥的 Harper 语法和风格整合。 |
| `@mission-platform/hunspell` | Emscripten Hunspell 拼写检查包装器。      |

### Forge 编译器目标

它们位于 `packages/compiler/plugins/` 而不是 `packages/` 中。 **框架**插件决定哪个运行时是中立组件
降低至； **CMS** 目标决定将其投影到哪个内容平台。两个轴组成，因此任何 CMS
目标可以绑定到任何框架插件。请参阅 [Forge 编译器管道](../../../packages/tooling/vite/forge/docs/locales/zh/reference/compiler.md)。

|套餐 |目的|
| :---------------------------------------------- | :-------------------------------------------------------------------------------- |
| `@mission-platform/forge-plugin-api` | `FrameworkOutputPlugin` 合约、语义 IR 类型和构建适配器类型。     |
| `@mission-platform/forge-plugin-react` | React 输出目标。                                                              |
| `@mission-platform/forge-plugin-vue` | Vue 3 输出目标。                                                              |
| `@mission-platform/forge-plugin-solid` | Solid 输出目标。                                                              |
| `@mission-platform/forge-plugin-svelte` | Svelte 5 输出目标。                                                           |
| `@mission-platform/forge-plugin-web-components` | Web 组件输出目标。                                                     |
| `@mission-platform/forge-cms-plugin-api` | `CmsOutputPlugin` 合约、中性内容模型、CMS 驱动程序和构建助手。 |
| `@mission-platform/forge-cms-storyblok` | Storyblok 组件对象、blok 包装器和 `components.json`。                |
| `@mission-platform/forge-cms-astro` |静态 `.astro` 模板和 `client:load` 框架岛。                    |
| `@mission-platform/forge-cms-ghost` | Ghost Handlebars 部分和 `config.custom` 主题片段。                   |
| `@mission-platform/forge-cms-jekyll` | Jekyll Liquid 包括 `_data` 架构和 `_config.yml` 片段。             |
| `@mission-platform/forge-cms-webflow` | Webflow `declareComponent` 代码组件和 `webflow.json` 库片段。 |

#### @mission-platform/forge-cms-plugin-api

|出口|类型 |描述 |
| :------------------------ | :------- | :------------------------------------------------------------------------------ |
| `analyzeContentComponent` |功能|将中立组件的 props 投影到平台中立内容模型上。   |
| `ContentComponent` |类型 |订购 `ContentField`、插槽和 `interactive` 标志。                     |
| `ContentFieldKind` |类型 | `text`、`richtext`、`number`、`boolean`、`option`、`asset`、`link`、`children`。 |
| `CmsOutputPlugin` |类型 |目标合约：一个绑定框架插件加上四个发射器。           |
| `defineForgeCmsPlugin` |功能|在配置时验证 CMS 目标。                                   |
| `generateCmsArtifacts` |功能|通用发现 → IR → 内容模型 → 发出 → 写入驱动程序。                |
| `defineTsdownForgeCms` |功能|一个 CMS 目标的 tsdown 配置，发出 `dist/cms/<cms>/<framework>/**`。     |
| `defineTsdownForgeCmsAll` |功能| CMS 目标列表的 tsdown 配置。                                       |
