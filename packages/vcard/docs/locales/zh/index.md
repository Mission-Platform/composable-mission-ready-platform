# `@mission-platform/vcard`

由规范英文源进行的机器辅助翻译。必要时请人工审校。包名、命令、路径与技术标识符保持不变。

> packages/vcard/docs/index.md: [packages/vcard/docs/index.md](../../index.md)
> 语言: 简体中文 (zh)

用于任务平台的共享 RFC 6350 vCard 和 RFC 5545 iCalendar 数据 API。

该包提供无损组件/属性解析和写入
`readICalendar`/`writeICalendar` 和 `readVCard`/`writeVCard`，以及 Forge
渲染器名为 `ForgeVCard` 和 `ForgeICalendar`。 `ForgeICalendar` 接受
`calendarEvents(readICalendar(source))` 的标准化结果，因此生成
框架组件保持独立于解析器运行时模块。

有关公共 API 和用法示例，请参阅 `llms.txt`。
