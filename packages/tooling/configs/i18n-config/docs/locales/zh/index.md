# @mission-platform/i18n-config

由规范英文源进行的机器辅助翻译。必要时请人工审校。包名、命令、路径与技术标识符保持不变。

> packages/tooling/configs/i18n-config/docs/index.md: [packages/tooling/configs/i18n-config/docs/index.md](../../index.md)
> 语言: 简体中文 (zh)

Mission Platform 工作区的共享区域设置和提取配置。

## 安装与使用

配置 i18next 时添加此包作为开发依赖项或
翻译提取：

```bash
pnpm add --save-dev @mission-platform/i18n-config
```

将区域设置源保留在拥有它们的工作区旁边。提取写入
所属工作空间下的命名空间包 `locales/<locale>/` 目录;
存储库级命令编排所有配置的工作区。

## 贡献

在发布之前运行包 lint 和格式检查。请勿将包装或
该配置包中的应用程序翻译内容。
