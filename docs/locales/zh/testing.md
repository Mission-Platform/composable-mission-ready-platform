# 任务平台测试

由规范英文源进行的机器辅助翻译。必要时请人工审校。包名、命令、路径与技术标识符保持不变。

> docs/testing.md: [docs/testing.md](../../testing.md)
> 语言: 简体中文 (zh)

本文档描述了 Mission Platform monorepo 的测试策略和工具。它既可以作为**操作指南
常见测试任务的指南**和底层配置的**技术参考**。

## 测试栈

Mission Platform 使用基于 Vitest 的现代统一测试堆栈：

- **Vitest**：用于单元、组件和基于浏览器的测试的主要测试运行程序。
- **@vue/test-utils**：用于测试 Vue 组件的标准库。
- **Vitest 浏览器模式（Playwright）**：在配置的情况下，用于交互和可视化测试的真实浏览器执行。
- **Storybook 测试运行程序**：Storybook 故事和 Vitest 之间的集成，用于自动交互测试。

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

要获得与 CI `--affected` 行为匹配的更快的本地反馈：

```bash
pnpm exec turbo run test --affected
```

`--affected` 选择相对于存储库基本修订版更改的工作区的测试任务。省略它来运行每个
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

要使用 `v8` 提供程序生成覆盖率报告：

```bash
pnpm --filter @mission-platform/components test:coverage
```

报告输出到每个工作区中的 `coverage/` 目录。

## 操作方法：编写测试

### 单元和组件测试

测试与源代码位于同一位置，并使用 `.spec.ts`（或 `.spec.tsx`）扩展。

```typescript
import { mount } from "@vue/test-utils";
import { describe, it, expect } from "vitest";
import ForgeButton from "./ForgeButton.vue";

describe("ForgeButton.vue", () => {
  it("renders props.label when passed", () => {
    const label = "Click Me";
    const wrapper = mount(ForgeButton, {
      props: { label },
    });
    expect(wrapper.text()).toMatch(label);
  });

  it("emits click event when clicked", async () => {
    const wrapper = mount(ForgeButton);
    await wrapper.trigger("click");
    expect(wrapper.emitted()).toHaveProperty("click");
  });
});
```

### 浏览器测试

Mission Platform 利用 Vitest 的浏览器模式进行需要真实 DOM 环境或跨浏览器的测试
验证。

1. 像往常一样编写测试文件。
2. 确保软件包 `vitest.config.ts` 启用浏览器模式（请参阅下面的参考）。
3. 使用 `pnpm test` 运行。

### 伪造 Web 脚本测试

使用 `@mission-platform/forge-web-script-vitest` 进行确定性编译器、工件、Wasm 和自托管奇偶校验
检查。它将编译委托给生产环境使用的相同编译器服务和 Vite 插件；它不会创建一个
第二个模块系统。

在测试 `.fws` 模块的工作区中安装包，然后使用标准 Vitest 配置组成其适配器：

```typescript
// vitest.config.ts
import { defineForgeWebScriptVitestConfig } from "@mission-platform/forge-web-script-vitest";

export default defineForgeWebScriptVitestConfig({
  environment: "node",
  forgeWebScript: {
    root: import.meta.dirname,
    requestedCapabilities: ["clock.now"],
    selfHostedVmMode: "interpret",
  },
  overrides: {
    // Consumer plugins, aliases, and other Vite/Vitest settings remain active.
    resolve: { alias: { "@fixtures": "./fixtures" } },
  },
});
```

对于直接编译器和运行时断言，请为每个套件或测试创建一个工具并将其放置在 `afterEach` 中：

```typescript
import { afterEach, describe, expect, it } from "vitest";
import {
  assertForgeWebScriptDiagnostic,
  assertForgeWebScriptNoDiagnostics,
  createForgeWebScriptTestHarness,
} from "@mission-platform/forge-web-script-vitest";

describe("FWS fixture", () => {
  const harness = createForgeWebScriptTestHarness({
    requestedCapabilities: ["clock.now"],
  });

  afterEach(() => harness.dispose());

  it("checks artifacts, Wasm exports, and explicit capabilities", async () => {
    const result = await harness.compile("valid/scalar.fws");
    assertForgeWebScriptNoDiagnostics(result.diagnostics);
    expect(result.artifact.manifest?.exports.map(({ name }) => name)).toEqual([
      "answer",
    ]);
    expect(
      (
        await harness.load<{ answer: () => number }>("valid/scalar.fws")
      ).answer(),
    ).toBe(42);

    const clock = await harness.load<{ current: () => bigint }>(
      "capabilities/clock-now.fws",
      {
        "clock.now": { now: () => 123n },
      },
    );
    expect(clock.current()).toBe(123n);
  });

  it("keeps diagnostic code, phase, and span structured", async () => {
    const result = await harness.inspect("diagnostics/invalid-type.fws");
    assertForgeWebScriptDiagnostic(result.diagnostics, {
      code: "FWS-TYPE-005",
      phase: "type-check",
      line: 2,
    });
  });
});
```

`load` 和 `loadSync` 仅接受测试提供的功能导入。缺少申报的进口和供应
未申报的进口明确失败；没有隐式注入浏览器或 Node API。使用 `compileGraph` 进行源导入
在测试链接配置时绘制图表并比较 `graphHash`、链接模块、声明和内容哈希。

适配器路径测试生成的 ESM 合约，如 Vitest 所见：

```typescript
import {
  abiManifest,
  load,
  loadSync,
  manifest,
} from "./fixtures/valid/scalar.fws";

expect(abiManifest).toEqual(manifest);
expect((await load<{ answer: () => number }>()).answer()).toBe(42);
expect(loadSync<{ answer: () => number }>().answer()).toBe(42);
```

对于 FWS 值，显式测试两个层。原始 WASM 测试应该断言
指针长度 ABI 和所有权调用；生成的 ESM 测试应断言
JavaScript 投影：

```typescript
const artifact = harness.compileSource(
  `
  export fn echo(value: string) -> string { return value; }
`,
  "strings.fws",
).artifact;

const generated = await importFromEsmSource(artifact.esmSource);
expect(generated.loadSync().echo("Δοκιμή 🚀")).toBe("Δοκιμή 🚀");
expect((await generated.load()).echo("")).toBe("");
```

生成的加载程序边界测试应涵盖 ASCII、空、多字节 UTF-8、
返回的串联、字符串功能导入、原始 `bytes` 元组以及
暴露的 `memory`。使用致命的 UTF-8 固定装置并断言临时
`fws_dealloc` 调用发生在成功返回、访客陷阱、主机异常、
和解码失败。检测之前生成的 `artifact.esmSource`
导入它；加载后修补导出不会观察到包装器
关闭原始分配器和解除分配器。

生成的适配器将一次调用的所有字符串参数打包为一个
客人分配。为函数保留分配计数断言
多个字符串参数，并保留纯标量测试以验证没有
字符串编组工作是为纯数字函数生成的。字节测试
必须继续传递 `[pointer, length]` 元组，而不是期望
自动 `Uint8Array` 转换。

基准工作区将原始指针长度适配器与
生成 ESM 适配器作为单独的 FWS 模式：

```bash
pnpm --filter @mission-platform/benchmark run bench -- \
  --node-only --warmup 3 --samples 10 \
  --output benchmark/results/fws-generated-boundary
```

报告包括构建、初始化和稳态执行阶段。的
FWS 原始 `wasm` 行使用新实例和三个字符串输入分配
基准测试内核； `wasm-generated` 使用生成的 `loadSync` 合约
和一个打包字符串输入分配。因为当前的来宾解除分配器
验证范围而不回收凹凸分配器空间、生成的字符串/字节
示例每次调用都使用一个新的加载器实例；标量样本重用加载的
实例。这隔离了每个分配密集的样本，并且是有意的
报告为加载程序边界开销，而不是持久实例声明。
每个工件报告原始 Wasm 字节、生成的 ESM 源字节、内容哈希、
以及比较使用的静态分配计数。仅比较行
当语料库哈希、主机运行时和基准模式匹配时。

例如，上面仅运行 Node 产生了 336 个测量相位结果
零失败和语料库哈希 `ad092f7c552cc914`。两行 FWS 都有原始 Wasm
哈希 `0ac58f11`，原始 Wasm 大小 1,625 字节，生成的 ESM 源大小 18,490
字节；原始和生成的字符串输入分配计数分别为 3 和 1。
Unicode-小字符串大小写，原始平均初始化时间为 0.00024 毫秒
生成了 0.00188 毫秒，原始平均执行时间为 0.0236 毫秒，而原始执行时间为 0.1070 毫秒
在记录的 Node 运行中生成。这些数字是有代表性的证据，
不提供跨机器性能保证；使用报告的每个案例样本
进行比较。

该插件还公开了 `?forge-web-script-manifest`、`?forge-web-script-declarations` 的显式虚拟查询，
`?forge-web-script-wasm` 和 `?forge-web-script-source-map`。为了使 TypeScript 可以发现这些环境模块，
将已发布的声明子路径添加到测试项目的类型中：

```json
{
  "compilerOptions": {
    "types": [
      "node",
      "@mission-platform/forge-web-script-vitest/forge-web-script"
    ]
  }
}
```

或者，将 `/// <reference types="@mission-platform/forge-web-script-vitest/forge-web-script" />` 添加到仅测试
类型项目包含的入口点。声明子路径仅是类型的，并且不添加运行时导入。

在 `packages/forge-web-script-vitest/fixtures/` 中使用共享装置来实现跨包语言和 ABI 一致性：
`valid/`、`diagnostics/`、`capabilities/`、`graphs/` 和 `self-hosted/` 特意保持稳定。在旁边放一个固定装置
涵盖私有实现细节的编译器、运行时或插件规范；对小型解析器使用内联源或
VM 单元案例。这可以保持夹具名称和清理的确定性，而无需强制通过线束进行低级测试。

`checkVmParity(file, mode)` 支持 `interpret`、`jit` 和 `aot`，但其报告是现有的有界自托管
lex-stage 平价合约。断言 `parity`、指纹、步骤和 AOT 再现性元数据；不处理该报告
作为任意编译的 FWS VM 执行或作为 Wasm 行为测试的替代。

使用正常工作区任务运行聚焦的 FWS 矩阵：

```bash
pnpm exec turbo run test build:check --filter @mission-platform/forge-web-script-vitest
pnpm exec turbo run test build:check --filter @mission-platform/forge-web-script
pnpm exec turbo run test build:check --filter @mission-platform/forge-web-script-runtime
pnpm exec turbo run test build:check --filter @mission-platform/vite-plugin-forge-web-script
```

## 技术参考

### 共享配置

大多数工作区使用 `@mission-platform/vite-config` 中的 `defineVitestConfig` 实用程序。这提供了一个标准化的
环境：

- **环境**：默认为 `jsdom`。
- **全局**：启用（除非需要，否则无需导入 `describe`、`it`、`expect`）。
- **插件**：包括 `@vitejs/plugin-vue` 和 i18n 块忽略。
- **覆盖范围**：预配置的 `v8` 提供程序。

**示例 `vitest.config.ts`：**

```typescript
import { defineVitestConfig } from "@mission-platform/vite-config/vitest";

export default defineVitestConfig({
  overrides: {
    // Package-specific overrides
  },
});
```

### 目录结构

- `src/**/*.spec.ts`：单元测试和组件测试。
- `src/**/*.stories.tsx`：故事书故事（也用作交互测试定义）。
- `apps/storybook/vitest.config.ts`：基于浏览器的交互测试的主要配置。

### 脚本摘要

|脚本 |命令|目的|
| :-------------- | :--------------------------------------------------------- | :------------------------------------- |
| `test` | `pnpm exec turbo run test` |运行所有工作区测试任务。          |
| `test:watch` | `pnpm --filter @mission-platform/components test:watch` |在监视模式下运行组件测试。    |
| `test:coverage` | `pnpm --filter @mission-platform/components test:coverage` |生成组件覆盖率报告。 |
| Rust/WASM | `cargo test --workspace` |运行本机 Rust 板条箱测试。           |

Wasm 包装器包通过其自己的包任务进行测试。例如，运行扫描程序包及其
更改扫描仪行为时将包装器放在一起：

```bash
pnpm exec turbo run test --filter @mission-platform/code-scanner...
```

## 相关文档

- [开发设置](development-setup.md)
- [最佳实践](best-practices.md)
- [封装开发](package-development.md)
