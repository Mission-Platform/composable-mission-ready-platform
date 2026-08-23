# @mission-platform/theme

由规范英文源进行的机器辅助翻译。必要时请人工审校。包名、命令、路径与技术标识符保持不变。

> packages/theme/docs/index.md: [packages/theme/docs/index.md](../../index.md)
> 语言: 简体中文 (zh)

`@mission-platform/theme` 拥有从 `@mission-platform/components` 中提取的一次写入主题表面。

## 公共面

- `ForgeThemeToggle` 循环共享亮、暗和自动首选项。
- `ForgeThemeProvider` 配置持久性并通过其作用域渲染属性公开主题状态。
- `ForgeThemeComposer` 控制范围或全局 `--mp-*` 令牌覆盖。
- 主题商店合约包括 `getThemeSnapshot`、`subscribeTheme`、`setTheme`、`toggleTheme`、`cycleTheme` 和
  `configureTheme`。
- Composer 合约包括配置合并、属性/令牌突变、CSS 变量转换和重置助手。

所有组件和存储都使用一种包本地实现，因此提供者、切换和作曲家消费者会观察到
特定于框架的 Forge 编译后的相同运行时合约。
