# 会议自我审查

由规范英文源进行的机器辅助翻译。必要时请人工审校。包名、命令、路径与技术标识符保持不变。

> docs/agent-guidance/session-self-review.md: [docs/agent-guidance/session-self-review.md](../../../agent-guidance/session-self-review.md)
> 语言: 简体中文 (zh)

在每次会话结束时完成此审查，无论任务成功、失败还是在实施前停止。审核是收尾记录，而不是扩展当前任务的许可。

## 结果审查

记录以下方面的简明证据：

- 尝试了什么以及要求什么结果。
- 预期行为与观察到的行为。
- 被证实、反驳或不确定的假设。
- 失败、工作受阻、倒退和未解决的风险。
- 执行的验证，包括命令、测试、诊断、扫描、审查及其结果。
- 最终的差异是否是集中的、可移植的、没有临时工件并且与存储库约定一致。
- 哪些指导使工作得以开展，哪些指导不明确、难以发现、重复、陈旧或不必要的成本。

保留有效的惯例。将观察到的问题与假设或推测性改进想法区分开来，并包括支持每个拟议变更的证据。

## MCP 审查

使用 MCP 工具或配置文件时，请回答以下问题：

- 所选配置文件是可以完成任务的最小配置文件吗？
- 在需要显式写入之前，是否首选有界只读检查工具？
- `review_changes` 和可用的安全检查是否足以检查提议的突变及其风险？
- 架构、输出限制、分页限制、超时或工具人体工程学是否会造成摩擦或隐藏有用的证据？
- 是否有任何写入路径需要更清晰的确认、更窄的边界、更强的隔离或更安全的后备？
- 术语和行为是否与 `mcp/README.md`、`mcp/developer/README.md`、`.ai/mcp/mcp.json`、`scripts/launch-mcp.mjs`、`mcp/developer/src/tools/profiles.ts` 和 `mcp/developer/src/tools/index.ts` 匹配？

不要仅仅因为方便而提出更广泛的配置文件或新工具。解释可以消除观察到的安全性、可靠性或理解性问题的最小改变。

## 改进决策

对每个改进机会进行分类：

- **文档跟进：** 当存储库行为正确但指导缺失、不清楚、重复、陈旧或难以发现时使用。建议对 `AGENTS.md` 或所属主题文档进行最小更新。
- **单独授权的实现：** 当发现需要更改 MCP 运行时行为、配置文件、模式、服务器注册、`.ai/mcp/mcp.json`、工具或其他实现时使用。将其记录为后续；除非明确授权，否则请勿将其作为文件审查的一部分实施。
- **无变化：**当观察结果是推测性的、缺乏证据或现有约定仍然是最安全和最明确的选择时使用。

任何后续操作都必须保留依赖方向、显式突变边界、可移植性、向后兼容性、最小权限和有界操作。链接证据并识别所有者、受影响的事实来源以及最小的安全下一步行动。

## 清仓格式

当需要书面审查时，在最终交接中使用这种紧凑的格式：

```markdown
### Session self-review
- Outcome: <expected and observed result>
- Evidence: <checks performed and results>
- Assumptions or uncertainty: <confirmed, disproved, or unresolved items>
- Guidance and MCP findings: <what helped or caused friction>
- Follow-up: <documentation, separately authorized implementation, or no change; include evidence>
```

相关政策：[质量标题](quality-rubric.md)、[存储库安全和验证](repository-safety-and-validation.md) 和根 [AGENTS.md](../../../../AGENTS.md)。
