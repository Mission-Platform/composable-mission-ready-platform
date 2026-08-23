# @mission-platform/vite-plugin-forge

由规范英文源进行的机器辅助翻译。必要时请人工审校。包名、命令、路径与技术标识符保持不变。

> vite-plugins/forge/docs/index.md: [vite-plugins/forge/docs/index.md](../../index.md)
> 语言: 简体中文 (zh)

Vite 和 tsdown 的框架中立 Forge 编译器驱动程序。这个套餐
拥有解析、规范化、语义分析、中性优化、缓存、
目标调度和通用构建编排；框架和CMS输出
软件包拥有其针对特定目标的降低和生成。

## 从这里开始

- [编译器管道参考](reference/compiler.md) — 阶段合同，
  目标所有权、缓存、诊断和生成的工件。
- [构建和测试指南](guides/development.md) — 本地开发和
  集成检查。
- [`README.md`](../../../README.md) — 消费者配置和代表
  Vite/tsdown 示例。
- [`llms.txt`](../../../llms.txt) — 简洁的包 API 和管道注释。

驱动程序需要显式 `FrameworkOutputPlugin`；它从不选择
框架从字符串或导入每个目标包。生成的模块是
中间工件，并且必须由所选目标的本机编译
适配器。
