# 存储库安全和验证

由规范英文源进行的机器辅助翻译。必要时请人工审校。包名、命令、路径与技术标识符保持不变。

> docs/agent-guidance/repository-safety-and-validation.md: [docs/agent-guidance/repository-safety-and-validation.md](../../../agent-guidance/repository-safety-and-validation.md)
> 语言: 简体中文 (zh)

对于实施、重构、测试、生成、存储库检查、工作树、LSP、安全性和文件管理任务，本主题是必需的。它保留根 `AGENTS.md` 中总结的详细操作约束。

## 依赖方向和资产发现

- `packages/` 中的代码绝不能从 `apps/` 导入。应用程序消耗可重用的包成员；域包可能依赖于较低级别的 `core`、`tooling` 和编译器合约，而无需导入应用程序。
- 在编写代码之前，使用存储库 MCP 工具（`list_components`、`get_component_usage`、`lsp_find_symbol` 和 `lsp_list_symbols`）检查现有资产和文件系统检查。
- 重用 `@mission-platform/components` 而不是创建重复的 UI 基元，引用 `--mp-*` 令牌而不是硬编码的视觉值，搜索 `packages/` 以获取共享实用程序，并使用带有 `@mission-platform/i18n` 的 YAML 目录来获取面向用户的字符串。
- 新的共享 UI 组件、可组合项、实用程序和设计令牌属于 `packages/`；共享 lint、格式和构建工具属于 `packages/tooling/configs/`。
- 修改包组件时，添加或更新其并置的 `.stories.tsx` 故事。 `apps/storybook` 工作台发现 Vue、React、Solid、Svelte 和 Web 组件中的包故事。

## 安全编码和合规性

所有代码和配置必须遵循 ISO/IEC 27001:2022 Control A.8.28，并防止 OWASP Top 10 (2025) 和 CWE Top 25。

- 切勿提交凭证、私钥、云令牌或其他秘密。
- 使用 `DOMPurify.sanitize` 清理 HTML、参数化查询并使用向量参数（例如 `execFile`）而不是内插的 shell 字符串。
- 使用现代密码学，例如 SHA-256 和 `crypto.getRandomValues`；切勿将 `Math.random()` 用于安全敏感值。
- 避免未经审查的 `postinstall` 生命周期脚本并通过目录引用固定依赖项。
- 保留最小权限、存储库根目录和路径边界、无 shell 执行、显式写入批准和安全工具边界。
- 在提出 PR 之前，请运行相关的开发人员 MCP 安全检查：`security_scan_secrets`、`security_analyze_code`、`security_audit_dependencies`、`security_audit_supply_chain`、`security_collect_compliance_evidence` 和 `security_audit_compliance`（如果适用）。

## 工作树和构建依赖关系

- 并行工作流必须使用通过 `node --experimental-strip-types scripts/worktree-manager.ts create <branch>` 配置的隔离 Git 工作树。
- 在新的工作树中，在包测试或类型检查之前构建上游工作区依赖项，因为内部 `dist/` 工件可能会丢失：

  ```bash
  pnpm exec turbo run build --filter <package-name>^...
  ```

- 工作树共享 `.turbo/cache`；不要擦除或绕过该缓存。

## 便携式LSP配置

- `agent-lsp.json` 中的 LSP 定义必须使用可移植的相对调用，例如 `["pnpm", "exec", "<server>", "--stdio"]` 或 `["pnpm", "--dir", "relative/path", ...]`。
- 切勿对绝对系统路径进行硬编码。 MCP LSP 服务器从检测到的存储库或工作树根运行语言服务器。
- LSP 查询和执行工具需要活动会话。检查 `lsp_status` 并在需要时使用 `lsp_start`。
- TypeScript 7 本机服务器使用 `tsc --lsp --stdio` (`typescript-go` 7.0.2)。整个工作区符号和悬停查询在索引期间可能会超时；使用 15,000–30,000 ms 协议超时，并通过包范围的类型检查和 Vitest 对其进行补充。
- 如果启动或发现超时，请使用包范围的类型检查和 Vitest 作为诊断后备，而不是阻止任务。

## 燧石和扫描仪验证

- Flint LSP 诊断仅是源级反馈；它们不能证明链接的多模块图发出有效的 Wasm 或其运行时 ABI 正确执行。
- 对于扫描仪图形更改，运行重点图形套件、程序包 `type-check` 和程序包 Vitest 套件。与源诊断分开记录伪影发射故障。
- 固定装置或简化的解码器路径无法建立完整的 ZXing 奇偶校验。在计划和拉取请求中明确标记不支持的模式、格式子集、元数据、重试和公共合同迁移。
- 如果静态链接失败，请在更改算法代码或弱化测试之前捕获图形模块和边缘计数、发射器诊断以及最小的隔离再现器。

## 代码风格和验证

- 新源文件使用 `.ts` 或 `.vue` 与 `<script setup lang="ts">`；公共 API 和导出函数需要显式类型。
- 对于缺失或清除的值使用 `undefined`，除非外部协议需要 `null`。
- Forge JSX 事件道具使用标准驼峰命名法名称，例如 `onKeyDown`、`onPointerDown` 和 `onMouseDown`。
- 按此顺序对导入进行分组，组内不包含空行：Node 内置函数、外部依赖项、内部 `@mission-platform/*` 包和相关文件。用一个空行分隔组。
- 运行 `pnpm --filter <pkg> run lint` 和 `pnpm --filter <pkg> run lint:style`；仅使用包 ESLint 修复适用的样式错误。 Markdown 和故事使用存储库格式化工作流程。
- 编译器、转译器、AST 和代码生成更改需要端到端集成覆盖。验证相同基本名称的非冲突输出、明确的条目重新导出以及保留的发出内容。
- `TargetIntentions.lowered` 在 `@mission-platform/forge-plugin-api` 中是强制的；目标插件需要降低计划。夹具、模拟和 CMS 集成插件必须提供 `{ framework, appliedOptimizations: [] }` 或运行 `lower -> optimize -> generate`。
- 在并行负载、多框架、文档提取和大型 AST 测试下，应使用显式 `60_000`–`120_000` 毫秒超时。
- 对于跨领域计划工作，请使用专注于端到端行为、负面测试和包范围的 lint 门的独立审查。

## 交互模式

使用第一个适用的模式并将其保留用于会话，除非其持久性规则允许切换：

1. `[CHAT]` 用于问候、闲聊、事实问题或简单的数学。
2. `[ADVANCED_CHAT]` 用于只读解释、分析、信息查找或建议。
3. `[RUN_VERIFY]` 用于简短的安全命令、应用程序运行或无需编辑的测试。
4. `[FAST_CODE]` 用于进行简单的单文件更改，无需额外的上下文收集。
5. `[SETUP]` 用于构建、安装、基础设施、环境修复或系统检查。
6. `[CODE]` 用于需要调查或多个步骤的重要项目变更。
7. `[NICHE]` 仅适用于不适合其他模式的专业取证、逆向工程、数据恢复或安全研究。

`[CHAT]` 和 `[CODE]` 不切换模式。仅在明确的实施请求后，`[ADVANCED_CHAT]` 才会切换到 `[CODE]`；如果 `[FAST_CODE]` 和 `[RUN_VERIFY]` 在三步内无法完成，则切换到 `[CODE]`；当需要实施时，`[SETUP]` 和 `[NICHE]` 可以切换到 `[CODE]`。

## 原子生成和文件管理

- 在成功生成之前切勿擦除或删除生成目标。将工件暂存在同级尝试目录（例如 `.forge-attempt/`）中，运行提交前诊断，并仅在检查通过后以原子方式交换。
- 保留存储库点文件，例如 `.gitkeep` 和 `.gitignore`，并在同步或修剪构建目标时保留运行中的暂存目录。
- 保持突变明确且有界。不要使用广泛的清理命令或删除不是为当前任务创建的文件。

## 开发者 MCP LSP 工作流程合同

与代码任务的手动文本搜索相比，开发人员更喜欢 MCP 的有界 `lsp_*` 代码智能工具。使用 `lsp_capabilities` 确认当前合同和可用性；在编辑之前，使用只读 `lsp_review_structure` 或 `lsp_debug_context`；在应用 LSP 编辑之前，使用 `lsp_preview_edit`；在更改之后，使用 `lsp_get_diagnostics`，然后在适用时使用 `lsp_run_build` 和 `lsp_run_tests`。

使用专门构建的映射：用于结构的 `lsp_list_symbols`、用于符号的 `lsp_find_symbol`、用于用法的 `lsp_find_references`、用于理解的 `lsp_inspect_symbol`、用于调用站点的 `lsp_find_callers`、用于函数替换的 `lsp_replace_symbol_body` 以及用于未使用符号的 `lsp_safe_delete_symbol`。使用记录的 `/lsp-*` 工作流程进行架构、影响、重构、安全编辑、测试关联和完整验证。

相关政策：[质量标题](quality-rubric.md)、[会话自我审查](session-self-review.md) 和根 [AGENTS.md](../../../../AGENTS.md)。
