# @mission-platform/forge-adapters

由规范英文源进行的机器辅助翻译。必要时请人工审校。包名、命令、路径与技术标识符保持不变。

> packages/core/forge-adapters/docs/index.md: [packages/core/forge-adapters/docs/index.md](../../index.md)
> 语言: 简体中文 (zh)

适用于中性 `@mission-platform/forge-jsx` 运行时的框架适配器。
组件针对 Forge JSX 编写一次并通过适配器呈现
为目标框架。

## Exports

|进入|目的|
| ------------------------------------------------- | -------------------------------------------- |
| `@mission-platform/forge-adapters/react` | `toReactComponent` 和 `renderToReact` |
| `@mission-platform/forge-adapters/vue` | `toVueComponent` 和 `renderToVue` |
| `@mission-platform/forge-adapters/solid` | SolidJS 标记和结构基元 |
| `@mission-platform/forge-adapters/svelte` | Svelte 渲染助手 |
| `@mission-platform/forge-adapters/web-components` |本机自定义元素和直接 DOM 运行时 |

框架包是可选的对等依赖项。安装使用的框架
通过所选适配器并仅导入其子路径。

```ts
import { toVueComponent } from '@mission-platform/forge-adapters/vue';
import { MyComponent } from '@mission-platform/components';

const VueComponent = toVueComponent(MyComponent);
```
