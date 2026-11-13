# 开发燧石

由规范英文源进行的机器辅助翻译。必要时请人工审校。包名、命令、路径与技术标识符保持不变。

> packages/flint/core/docs/guides/development.md: [packages/flint/core/docs/guides/development.md](../../../guides/development.md)
> 语言: 简体中文 (zh)

本指南适用于更改 Flint 解析器的贡献者，已检查
合同或一致性固定装置。

## 安装并检查包

从存储库根目录，安装依赖项并运行包检查：

```bash
pnpm install
pnpm --filter @mission-platform/flint build:check
pnpm --filter @mission-platform/flint test
```

发布前运行 `pnpm --filter @mission-platform/flint build`。
该构建会在 `dist/` 下发出浏览器安全的捆绑包和声明文件。

## 添加语言更改

一起更新语法和检查的前端。添加一个聚焦装置
`src/fixtures/` 和用于诊断或生成行为的回归测试。
保持语言版本 `1.0` 和 ABI 版本 `1.2` 明确，除非更改是
有意的兼容性修订。 ABI 更改必须更新清单，
加载器和兼容性文档。

该包是浏览器安全的。不要将仅限 Node 的 API 添加到公共外观；
Node 特定工具属于 `@mission-platform/flint-cli`。

## 生成的工件和源工件

`src/self-hosted/fws/` 下签入的 `.flint` 源是源工件，
不是手工复制的 JavaScript。将生成的输出保留在 `dist/` 中并且不提交
本地构建输出。包文档参考保留在旁边
包并将由文档提取工作流程重新生成。

## 检查二级管道

规范的前端边界是确定性的节点海图。的
图在降低到 Wasm IR 之前进行了优化，其中应用了第二个优化器
后端安全传播、死代码删除、地址简化、切换
降低和确定性布局。保持两个阶段可审计：优化器
报告和选定的边界策略必须保留在编译器工件中。

使用运行时边界检查，除非证明生成规则建立了每个
访问同样安全。 `proven-safe` 和 `excluded-by-profile` 是显式策略
值，而不是隐式释放行为。 `.sonir.json` 缓存工件是
仅诊断数据；读者必须验证其架构、哈希值、策略和
在显示之前进行限制，并且绝不能执行图形内容。

对于 CLI 烟雾检查：

```bash
flint check src/example.flint --bounds-checks runtime --optimizer-report --format json
flint inspect-sonir .cache/example.sonir.json --format json
```

更改分析时，在更改之前添加事实和稳定的诊断测试
优化规则。发展分析应该揭示未知的范围，
别名/生命周期状态、切换覆盖范围和传递元数据；必须严格分析
阻止不安全的边界策略请求和区域/所有权违规。
