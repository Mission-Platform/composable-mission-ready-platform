# 任务平台测试

由规范英文源进行的机器辅助翻译。必要时请人工审校。包名、命令、路径与技术标识符保持不变。

> 英文原文: [docs/testing.md](../../testing.md)
> 语言: 简体中文 (zh)

本文档描述了 Mission Platform monorepo 的测试策略和工具。它既可以作为**操作指南
常见测试任务的指南**和底层配置的**技术参考**。

## 测试栈

Mission Platform 使用基于 Vitest:

- **Vitest**：用于单元、组件和基于浏览器的测试的主要测试运行程序。
- **@vue/test-utils**：用于测试的标准库 Vue 成分。
- **Vitest 浏览器模式（Playwright）**：在配置的情况下，用于交互和可视化测试的真实浏览器执行。
- **故事书测试运行程序**：故事书故事和 Vitest 用于自动化交互测试。

## 操作方法：运行测试

测试通过 Turborepo 执行，以利用缓存和工作区感知执行。

### 运行所有测试

要在整个 monorepo 上运行所有单元和组件测试：

```bash
pnpm test
```

### 为特定工作区运行测试

要对单个包或应用程序运行测试：

```bash
pnpm exec turbo run test --filter @mission-platform/<name>
```

### 运行受影响的测试（CI 风格）
获得与 CI 相匹配的更快的本地反馈 `--affected` 行为：

```bash
pnpm exec turbo run test --affected
```

`--affected` 为相对于存储库的基本修订版本更改的工作区选择测试任务。省略它来运行每个
工作区测试任务。承保范围视套餐而定；例如，组件包提供：

```bash
pnpm --filter @mission-platform/components test:coverage
```

### 观看模式
对于开发，请使用监视模式对文件更改重新运行测试：

```bash
pnpm --filter @mission-platform/components test:watch
```

### 覆盖范围报告

使用以下命令生成覆盖率报告 `v8` 提供者：

```bash
pnpm --filter @mission-platform/components test:coverage
```

报告输出到 `coverage/` 每个工作区中的目录。

## 操作方法：编写测试

### 单元和组件测试

测试与源代码位于同一位置并使用 `.spec.ts` （或者 `.spec.tsx`) 扩大。

```typescript
import { mount } from '@vue/test-utils';
import { describe, it, expect } from 'vitest';
import ForgeButton from './ForgeButton.vue';

describe('ForgeButton.vue', () => {
  it('renders props.label when passed', () => {
    const label = 'Click Me';
    const wrapper = mount(ForgeButton, {
      props: { label }
    });
    expect(wrapper.text()).toMatch(label);
  });

  it('emits click event when clicked', async () => {
    const wrapper = mount(ForgeButton);
    await wrapper.trigger('click');
    expect(wrapper.emitted()).toHaveProperty('click');
  });
});
```

### 浏览器测试

任务平台利用 Vitest的浏览器模式，用于需要真实 DOM 环境或跨浏览器的测试
验证。

1. 像往常一样编写测试文件。
2.保证包装 `vitest.config.ts` 启用浏览器模式（请参阅下面的参考）。
3. 运行 `pnpm test`.

## 技术参考

### 共享配置

大多数工作区使用 `defineVitestConfig` 效用来自 `@mission-platform/vite-config`。这提供了一个标准化的
环境：

- **环境**： `jsdom` 默认情况下。
- **全局**：启用（无需导入 `describe`, `it`, `expect` 除非需要）。
- **插件**：包括 `@vitejs/plugin-vue` 和 i18n 块忽略。
- **覆盖范围**：预配置 `v8` 提供者。

**例子 `vitest.config.ts`:**

```typescript
import { defineVitestConfig } from '@mission-platform/vite-config/vitest';

export default defineVitestConfig({
  overrides: {
    // Package-specific overrides
  }
});
```

### 目录结构

- `src/**/*.spec.ts`：单元测试和组件测试。
- `src/**/*.stories.tsx`：故事书故事（也用作交互测试定义）。
- `apps/storybook/vitest.config.ts`：基于浏览器的交互测试的主要配置。

### 脚本摘要

|脚本|命令 |目的|
|:----------------|:--------------------------|:--------------------------------------------|
| `test`          | `pnpm exec turbo run test`                              |运行所有工作区测试任务。            |
| `test:watch`    | `pnpm --filter @mission-platform/components test:watch` |在监视模式下运行组件测试。      |
| `test:coverage` | `pnpm --filter @mission-platform/components test:coverage` |生成组件覆盖率报告。 |
| Rust/WASM | `cargo test --workspace` |运行本机 Rust 板条箱测试。 |

Wasm 包装器包通过其自己的包任务进行测试。例如，运行扫描程序包及其
更改扫描仪行为时将包装器放在一起：

```bash
pnpm exec turbo run test --filter @mission-platform/code-scanner...
```

## 相关文档

- [开发设置](development-setup.md)
- [最佳实践](best-practices.md)
- [封装开发](package-development.md)
