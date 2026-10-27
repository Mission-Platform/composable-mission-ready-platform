# Session Self-Review

Complete this review at the end of every session, whether the task succeeded, failed, or stopped before implementation. The review is a closeout record, not permission to expand the current task.

## Outcome Review

Record concise evidence for:

- What was attempted and what outcome was requested.
- Expected behavior versus observed behavior.
- Assumptions that were confirmed, disproved, or left uncertain.
- Failures, blocked work, regressions, and unresolved risks.
- Verification performed, including commands, tests, diagnostics, scans, reviews, and their results.
- Whether the final diff is focused, portable, free of temporary artifacts, and consistent with repository conventions.
- Which guidance enabled the work and which instruction was ambiguous, difficult to discover, duplicated, stale, or unnecessarily costly.

Preserve conventions that worked. Distinguish observed issues from hypotheses or speculative improvement ideas, and include the evidence supporting each proposed change.

## MCP Review

When MCP tools or profiles were used, answer these questions:

- Was the selected profile the minimal profile that could complete the task?
- Were bounded, read-only inspection tools preferred until an explicit write was necessary?
- Were `review_changes` and the available security checks sufficient to inspect the proposed mutation and its risks?
- Did a schema, output bound, pagination limit, timeout, or tool ergonomics create friction or hide useful evidence?
- Did any write path require clearer confirmation, narrower bounds, stronger isolation, or a safer fallback?
- Did terminology and behavior match `mcp/README.md`, `mcp/developer/README.md`, `.ai/mcp/mcp.json`, `scripts/launch-mcp.mjs`, `mcp/developer/src/tools/profiles.ts`, and `mcp/developer/src/tools/index.ts`?

Do not propose a broader profile or a new tool merely because it is convenient. Explain the smallest change that would remove an observed safety, reliability, or comprehension problem.

## Improvement Decision

Classify each improvement opportunity:

- **Documentation follow-up:** use when the repository behavior is correct but guidance is missing, unclear, duplicated, stale, or hard to discover. Propose the smallest update to `AGENTS.md` or the owning topic document.
- **Separately authorized implementation:** use when the finding requires changing MCP runtime behavior, profiles, schemas, server registration, `.ai/mcp/mcp.json`, tooling, or another implementation. Record it as a follow-up; do not implement it as part of a documentation review unless explicitly authorized.
- **No change:** use when the observation is speculative, lacks evidence, or the existing convention remains the safest and clearest choice.

Any follow-up must preserve dependency direction, explicit mutation boundaries, portability, backward compatibility, least privilege, and bounded operations. Link the evidence and identify the owner, affected source of truth, and smallest safe next action.

## Closeout Format

Use this compact format in the final handoff when a written review is required:

```markdown
### Session self-review
- Outcome: <expected and observed result>
- Evidence: <checks performed and results>
- Assumptions or uncertainty: <confirmed, disproved, or unresolved items>
- Guidance and MCP findings: <what helped or caused friction>
- Follow-up: <documentation, separately authorized implementation, or no change; include evidence>
```

Related policy: [Quality rubric](quality-rubric.md), [Repository safety and validation](repository-safety-and-validation.md), and the root [AGENTS.md](../../AGENTS.md).