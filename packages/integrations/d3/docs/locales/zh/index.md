# @mission-platform/d3

由规范英文源进行的机器辅助翻译。必要时请人工审校。包名、命令、路径与技术标识符保持不变。

> packages/integrations/d3/docs/index.md: [packages/integrations/d3/docs/index.md](../../index.md)
> 语言: 简体中文 (zh)

`@mission-platform/d3` 在 D3 和 Mission Platform 一次性写入组件之间提供框架中立的集成
系统。

## 建筑学

该包将命令式 D3 基于选择的渲染与声明式反应式 UI 树连接起来：

- **中性实现**：构建在 `@mission-platform/forge-jsx` 挂钩（`useRef`、`useEffect`）之上。
- **双框架目标**：由 `@mission-platform/vite-plugin-forge` 转换为本机 React (`./react`) 和 Vue 3
  (`./vue`) 可组合项。
- **选择性依赖**：直接导入 `d3-selection` 以保持客户端包大小最小。

## 关键API

### `useD3`

```ts
function useD3<E extends Element>(draw: D3Draw<E>, dependencies?: MpDependencyList): MpRef<E | null>;
```

附加到 DOM/SVG 元素引用并在以下情况下执行传递 D3 选择 (`D3Selection<E>`) 的 `draw` 函数
已安装以及依赖项发生更改时。 `draw` 可以选择返回拆卸清理函数。

### 保证金实用程序

#### `resolveMargin(input?: MarginInput): Margin`

将部分或缺失的边距对象标准化为完整的 `{ top, right, bottom, left }` 像素值。

#### `innerDimensions(outerWidth: number, outerHeight: number, marginInput?: MarginInput): InnerDimensions`

计算 `innerWidth`、`innerHeight` 并解析 `margin` 以进行 SVG 视图框计算。

```ts
interface InnerDimensions {
  innerWidth: number;
  innerHeight: number;
  margin: Margin;
}
```
