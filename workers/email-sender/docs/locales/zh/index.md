# @mission-platform/email-sender

由规范英文源进行的机器辅助翻译。必要时请人工审校。包名、命令、路径与技术标识符保持不变。

> workers/email-sender/docs/index.md: [workers/email-sender/docs/index.md](../../index.md)
> 语言: 简体中文 (zh)

仅限本地的 Cloudflare Worker，接受完整的 HTML 并将其发送到
通过 SMTP 的 MailPit。该工作区拥有 `/api/email/send` 合约及其
MailPit 开发配置。

## 本地使用

端点验证 `{ to, recipientName, html }` 并返回稳定的 JSON
交付后的结果。启动MailPit，生成本地Worker绑定，然后运行
工人：

```bash
docker run --rm --name mission-mailpit -p 1025:1025 -p 8025:8025 axllent/mailpit
pnpm --filter @mission-platform/email-sender types
pnpm --filter @mission-platform/email-sender dev -- --port 8787
```

默认 SMTP 端点是 `127.0.0.1:1025`，MailPit UI 位于
`http://localhost:8025`。使用另一个变量时覆盖本地 Wrangler 变量
主机。

该工作人员是本地展示，而不是生产邮件服务。从来没有
将凭据或机密放入跟踪的 Wrangler 配置中。

- [开发指南](guides/development.md)
- [`README.md`](../../../README.md)
