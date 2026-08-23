# 开发电子邮件发送器工作线程

由规范英文源进行的机器辅助翻译。必要时请人工审校。包名、命令、路径与技术标识符保持不变。

> workers/email-sender/docs/guides/development.md: [workers/email-sender/docs/guides/development.md](../../../guides/development.md)
> 语言: 简体中文 (zh)

从存储库根运行包检查：

```bash
pnpm --filter @mission-platform/email-sender build:check
pnpm --filter @mission-platform/email-sender test
pnpm --filter @mission-platform/email-sender build
```

更改后运行 `pnpm --filter @mission-platform/email-sender types`
绑定。添加端点验证、SMTP 失败和稳定响应测试
合同变更。保持 Worker 处理程序与 Cloudflare 兼容并保持
本地开发配置背后的仅 MailPit 行为。
