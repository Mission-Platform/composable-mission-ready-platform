# @mission-platform/web-lua

由规范英文源进行的机器辅助翻译。必要时请人工审校。包名、命令、路径与技术标识符保持不变。

> packages/web-lua/docs/index.md: [packages/web-lua/docs/index.md](../../index.md)
> 语言: 简体中文 (zh)

访客拥有的 Lua 运行时基础由 Forge Web Script 编译而成。这个套餐
拥有运行时兼容性合约及其主机能力边界。

## 从这里开始

- [Lua 5.5.1 兼容性参考](reference/compatibility.md) — 已测试，
  能力门控和未解决的行为。
- [构建和测试指南](guides/development.md) — 运行时装置和输出
  限制。
- 包自述文件和生成的参考提供了简洁的包 API 注释。

浏览器条目为`@mission-platform/web-lua`； Node 消费者使用
显式 `@mission-platform/web-lua/node` 导出。宿主效应被否认
默认并需要明确的能力策略。
