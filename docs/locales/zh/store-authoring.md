# 商店创作

由规范英文源进行的机器辅助翻译。必要时请人工审校。包名、命令、路径与技术标识符保持不变。

> docs/store-authoring.md: [docs/store-authoring.md](../../store-authoring.md)
> 语言: 简体中文 (zh)

存储用于管理包内共享的跨组件状态。与应用程序级商店（如 Pinia 或
Redux），任务平台中的包存储被设计为**框架中立的可观察模块**。这允许
编写一次组件即可通过 Forge 挂钩使用它们，而不管主机框架如何。

## 目录布局

每个存储必须驻留在 `src/stores/` 内自己命名的子目录中，并附有一个共同定位的测试文件和一个
当地桶。

```text
src/stores/
├── theme-store/
│   ├── theme-store.ts        # Store logic (observable)
│   ├── theme-store.spec.ts   # Required unit tests
│   └── index.ts              # Local barrel
└── index.ts                  # Package-level re-exports
```

## 可观察的模式

包存储避免了特定于框架的依赖关系。相反，它们遵循一个简单的可观察模式：

1. **私有状态**：将状态保留在模块范围内（普通 TypeScript 值）。
2. **快照访问**：提供 `getSnapshot()` 函数来检索当前状态。
3. **订阅**：提供`subscribe(listener)`函数，向列表添加回调并返回取消订阅
   功能。
4. **Mutators**：提供更新状态的函数，更新后必须通知所有监听者。

## 创作规则

1. **与框架无关**：不要从存储模块内的 `vue`、`react` 或 `@mission-platform/forge-jsx` 挂钩导入
   本身。
2. **显式类型**：始终为商店状态定义和导出接口。
3. **SSR 安全**：保护对浏览器 API（例如 `localStorage`）的访问，以便可以在 Node.js 中初始化存储
   环境。
4. **强制测试**：每个商店都必须有一个位于同一位置的 `.spec.ts` 文件。

## 示例商店

```ts
export interface ThemeState {
  theme: 'light' | 'dark' | 'auto';
}

let state: ThemeState = { theme: 'auto' };
const listeners = new Set<() => void>();

export function getThemeSnapshot(): ThemeState {
  return state;
}

export function subscribeTheme(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setTheme(theme: ThemeState['theme']): void {
  state = { ...state, theme };
  listeners.forEach((listener) => listener());
}
```

## 消费组件中的存储

要在一次写入组件中使用存储，请使用 `@mission-platform/forge-jsx` 中的 `useState` 和 `useEffect` 桥接它：

```tsx
const [snapshot, setSnapshot] = useState(getThemeSnapshot());

useEffect(() => {
  return subscribeTheme(() => setSnapshot(getThemeSnapshot()));
}, []);
```

## 脚手架

使用 Mission Platform Developer MCP 工具生成新的商店骨架：

```bash
# Example: Creating a new 'auth-store' in the 'components' package
scaffold_store(name="auth-store", package="components", apply=true)
```

## 相关指南

- [封装开发](package-development.md)
- [原子组件设计](atomic-component-design.md)
- [可组合创作](composable-authoring.md)
- [实用程序创作](util-authoring.md)
